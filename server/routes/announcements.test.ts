// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let n = 0
const student = (name: string, opts: { entryYear?: number; course?: string } = {}) => {
  const person = addPerson({ name, handle: `${name.toLowerCase()}${++n}`, course: opts.course })
  if (opts.entryYear) store.people.get(person.id)!.profile.entry_year = opts.entryYear
  return person
}
// Superadmins come from SUPERADMIN_EMAILS (root@usp.br in the test env).
const superadmin = () => addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
const announcements = (userId: string) => store.notifications.filter((x) => x.userId === userId && x.type === 'announcement')
const AVISO = { title: 'Prova adiada', body: 'A prova foi para sexta.' }

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
})

describe('admin announcements', () => {
  it('refuses non-superadmins', async () => {
    const ana = student('Ana')
    const res = await (await as(ana)).post('/api/admin/announcements').send({ ...AVISO, audience: 'all' })
    expect(res.status).toBe(403)
  })

  it('reaches only the cohort and not the author', async () => {
    const root = superadmin()
    store.people.get(root.id)!.profile.entry_year = 2024
    const a = student('Ana', { entryYear: 2024 })
    const b = student('Bia', { entryYear: 2023 })
    const res = await (await as(root)).post('/api/admin/announcements').send({ ...AVISO, audience: 'cohort', audienceValue: '2024' })
    expect(res.status).toBe(201)
    expect(res.body.recipients).toBe(1)
    expect(announcements(a.id)).toHaveLength(1)
    expect(announcements(b.id)).toHaveLength(0)
    expect(announcements(root.id)).toHaveLength(0)
    expect(announcements(a.id)[0].payload).toEqual({ title: 'Prova adiada', body: 'A prova foi para sexta.' })
  })

  it('rejects a malformed cohort', async () => {
    const root = superadmin()
    const res = await (await as(root)).post('/api/admin/announcements').send({ ...AVISO, audience: 'cohort', audienceValue: 'abc' })
    expect(res.status).toBe(400)
  })

  it('answers 201 with zero recipients for a valid but empty course', async () => {
    const root = superadmin()
    const res = await (await as(root)).post('/api/admin/announcements').send({ ...AVISO, audience: 'course', audienceValue: 'Curso Inexistente' })
    expect(res.status).toBe(201)
    expect(res.body.recipients).toBe(0)
  })

  it('rejects javascript: links and accepts internal paths', async () => {
    const root = superadmin()
    const api = await as(root)
    expect((await api.post('/api/admin/announcements').send({ ...AVISO, audience: 'all', link: 'javascript:alert(1)' })).status).toBe(400)
    expect((await api.post('/api/admin/announcements').send({ ...AVISO, audience: 'all', link: '//evil.com' })).status).toBe(400)
    expect((await api.post('/api/admin/announcements').send({ ...AVISO, audience: 'all', link: '/entidades/dasi' })).status).toBe(201)
  })

  it('gives each recipient exactly one announcement notification', async () => {
    const root = superadmin()
    const a = student('Ana')
    const b = student('Bia')
    const res = await (await as(root)).post('/api/admin/announcements').send({ ...AVISO, audience: 'all' })
    expect(res.body.recipients).toBe(2)
    expect(announcements(a.id)).toHaveLength(1)
    expect(announcements(b.id)).toHaveLength(1)
  })

  it('validates title and body lengths and the entity audience', async () => {
    const root = superadmin()
    const api = await as(root)
    expect((await api.post('/api/admin/announcements').send({ title: '', body: 'x', audience: 'all' })).status).toBe(400)
    expect((await api.post('/api/admin/announcements').send({ title: 'x', body: 'y'.repeat(501), audience: 'all' })).status).toBe(400)
    expect((await api.post('/api/admin/announcements').send({ ...AVISO, audience: 'entity', audienceValue: 'nao-existe' })).status).toBe(400)
    expect((await api.post('/api/admin/announcements').send({ ...AVISO, audience: 'entity', audienceValue: 'dasi' })).status).toBe(201)
  })
})

describe('entity announcements', () => {
  it('reaches active members except the author, tagged with the entity', async () => {
    const admin = student('Ada')
    const m = student('Mia')
    addMember('dasi', admin.id, 'admin')
    addMember('dasi', m.id)
    const res = await (await as(admin)).post('/api/entities/dasi/announcements').send(AVISO)
    expect(res.status).toBe(201)
    expect(res.body.recipients).toBe(1)
    expect(announcements(m.id)[0].entityId).toBe('dasi')
    expect(announcements(admin.id)).toHaveLength(0)
  })

  it('refuses a plain member', async () => {
    const m = student('Mia')
    addMember('dasi', m.id)
    expect((await (await as(m)).post('/api/entities/dasi/announcements').send(AVISO)).status).toBe(403)
  })

  it('limits entity admins to 3 per 24h while the superadmin passes', async () => {
    const admin = student('Ada')
    const m = student('Mia')
    addMember('dasi', admin.id, 'admin')
    addMember('dasi', m.id)
    const api = await as(admin)
    for (let i = 0; i < 3; i++) expect((await api.post('/api/entities/dasi/announcements').send(AVISO)).status).toBe(201)
    const fourth = await api.post('/api/entities/dasi/announcements').send(AVISO)
    expect(fourth.status).toBe(429)
    expect(fourth.body.error).toBe('Limite de 3 avisos por dia')
    const root = superadmin()
    expect((await (await as(root)).post('/api/entities/dasi/announcements').send(AVISO)).status).toBe(201)
  })
})
