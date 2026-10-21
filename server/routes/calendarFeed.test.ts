// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import { addEntity, addMember, addPerson, createEvent, resetStore, store } from '../test/fakeSocialDb.js'
import { anonymous, as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let n = 0
const DAY = 86_400_000
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString()
const student = (name: string, opts: { courses?: string[] } = {}) => addPerson({ name, handle: `${name.toLowerCase()}${++n}`, ...opts })
const pathOf = (url: string) => new URL(url).pathname

function seed(overrides: Record<string, unknown>) {
  return createEvent({
    scope: 'usp', scopeValue: null, title: 'Evento', description: null, kind: 'event', startsAt: future(5), endsAt: null, allDay: false,
    location: null, link: null, visibility: 'public', status: 'approved', createdBy: null, ...overrides,
  } as Parameters<typeof createEvent>[0])
}

async function enable(who: Awaited<ReturnType<typeof as>>) {
  const res = await who.post('/api/calendar-feed/token')
  expect(res.status).toBe(200)
  return pathOf(res.body.url as string)
}

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
  addEntity('atletica', 'Atlética')
})

describe('calendar feed token', () => {
  it('generates a link, serves the feed and stores only the hash', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    await seed({ title: 'Semana de recepção' })
    store.scheduleEntries.set(ana.id, [{ weekday: 0, startsAt: '08:00', endsAt: '09:40', title: 'Cálculo', code: 'MAT0101', room: '101', building: 'I1' }])
    const api = await as(ana)
    const created = await api.post('/api/calendar-feed/token')
    expect(created.body.url).toMatch(/^https?:\/\/[^/]+\/api\/calendar-feed\/[A-Za-z0-9_-]{43}\.ics$/)
    const token = pathOf(created.body.url).split('/').pop()!.replace('.ics', '')
    expect(store.feedHashes.get(ana.id)).not.toContain(token)
    const feed = await anonymous().get(pathOf(created.body.url))
    expect(feed.status).toBe(200)
    expect(feed.headers['content-type']).toBe('text/calendar; charset=utf-8')
    expect(feed.headers['cache-control']).toBe('private, max-age=900')
    expect(feed.headers['content-disposition']).toBe('inline; filename="dasiboard.ics"')
    expect(feed.text).toContain('SUMMARY:Semana de recepção')
    expect(feed.text).toContain('RRULE:FREQ=WEEKLY')
    expect(feed.text).toContain('MAT0101')
    expect((await api.get('/api/calendar-feed/status')).body).toEqual({ enabled: true })
  })

  it('a new token invalidates the old one', async () => {
    const api = await as(student('Ana'))
    const first = await enable(api)
    const second = await enable(api)
    expect(second).not.toBe(first)
    expect((await anonymous().get(first)).status).toBe(404)
    expect((await anonymous().get(second)).status).toBe(200)
  })

  it('DELETE turns the feed off', async () => {
    const api = await as(student('Ana'))
    const path = await enable(api)
    expect((await api.delete('/api/calendar-feed/token')).status).toBe(204)
    expect((await anonymous().get(path)).status).toBe(404)
    expect((await api.get('/api/calendar-feed/status')).body).toEqual({ enabled: false })
  })

  it('answers 404 without a body for wrong or malformed tokens', async () => {
    const res = await anonymous().get(`/api/calendar-feed/${'a'.repeat(43)}.ics`)
    expect(res.status).toBe(404)
    expect(res.text).toBe('')
    expect((await anonymous().get('/api/calendar-feed/abc.ics')).status).toBe(404)
    expect((await anonymous().get(`/api/calendar-feed/${'a'.repeat(43)}`)).status).toBe(404)
  })

  it('requires a session and an allowed origin to write', async () => {
    expect((await anonymous().post('/api/calendar-feed/token')).status).toBe(401)
    const api = await as(student('Ana'))
    const res = await api.post('/api/calendar-feed/token').set('Origin', 'https://evil.example')
    expect(res.status).toBe(403)
    expect(store.feedHashes.size).toBe(0)
    expect((await request(app).get('/api/calendar-feed/status')).status).toBe(401)
  })
})

describe('calendar feed content', () => {
  it('leaves out pending, cancelled, foreign members-only and unfollowed class events', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    addMember('dasi', ana.id)
    await seed({ title: 'Aprovado' })
    await seed({ title: 'Pendente', status: 'pending' })
    await seed({ title: 'Cancelado', status: 'cancelled' })
    await seed({ title: 'Minha matéria', scope: 'class', scopeValue: 'ACH2001' })
    await seed({ title: 'Outra matéria', scope: 'class', scopeValue: 'ACH9999' })
    await seed({ title: 'Reservado DASI', scope: 'entity', scopeValue: 'dasi', visibility: 'members' })
    await seed({ title: 'Reservado Atlética', scope: 'entity', scopeValue: 'atletica', visibility: 'members' })
    await seed({ title: 'Meu pendente', status: 'pending', createdBy: ana.id })
    const text = (await anonymous().get(await enable(await as(ana)))).text
    for (const shown of ['Aprovado', 'Minha matéria', 'Reservado DASI']) expect(text).toContain(`SUMMARY:${shown}`)
    for (const hidden of ['Pendente', 'Cancelado', 'Outra matéria', 'Atlética', 'Meu pendente']) expect(text).not.toContain(hidden)
    expect(text).toContain('Escopo: DASI')
  })

  it('does not give a superadmin the moderation queue', async () => {
    const root = addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
    await seed({ title: 'Pendente', status: 'pending' })
    await seed({ title: 'Escondido', status: 'hidden' })
    await seed({ title: 'Aprovado' })
    const text = (await anonymous().get(await enable(await as(root)))).text
    expect(text).toContain('SUMMARY:Aprovado')
    expect(text).not.toContain('Pendente')
    expect(text).not.toContain('Escondido')
  })
})
