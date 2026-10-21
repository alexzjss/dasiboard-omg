// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addMember, addPerson, createEvent, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let n = 0
const DAY = 86_400_000
const future = (days: number, hours = 0) => new Date(Date.now() + days * DAY + hours * 3_600_000).toISOString()
const student = (name: string, opts: { courses?: string[]; campus?: string } = {}) => addPerson({ name, handle: `${name.toLowerCase()}${++n}`, ...opts })
const superadmin = () => addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
const body = (extra: Record<string, unknown> = {}) => ({ scope: 'usp', title: 'Semana de recepção', kind: 'event', startsAt: future(5), allDay: false, ...extra })
const RANGE = () => `from=${encodeURIComponent(future(0))}&to=${encodeURIComponent(future(30))}`
const notes = (userId: string, type?: string) => store.notifications.filter((x) => x.userId === userId && (!type || x.type === type))
const ids = async (who: Awaited<ReturnType<typeof as>>) => ((await who.get(`/api/events?${RANGE()}`)).body.events as { id: string }[]).map((e) => e.id)

async function seed(overrides: Record<string, unknown>) {
  return createEvent({
    scope: 'usp', scopeValue: null, title: 'Evento', description: null, kind: 'event', startsAt: future(5), endsAt: null, allDay: false,
    location: null, link: null, visibility: 'public', status: 'approved', createdBy: null, ...overrides,
  } as Parameters<typeof createEvent>[0])
}

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
  addEntity('atletica', 'Atlética')
})

describe('POST /api/events', () => {
  it('refuses a class the student does not take and an entity they left', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    addMember('atletica', ana.id)
    store.members[0].left_at = new Date().toISOString()
    const api = await as(ana)
    const klass = await api.post('/api/events').send(body({ scope: 'class', scopeValue: 'ACH9999' }))
    expect(klass.status).toBe(403)
    expect(klass.body.error).toBe('Você só pode propor eventos onde participa')
    expect((await api.post('/api/events').send(body({ scope: 'entity', scopeValue: 'atletica' }))).status).toBe(403)
  })

  it('publishes class events at once and sends moderated ones to review, notifying moderators only', async () => {
    const root = superadmin()
    const ana = student('Ana', { courses: ['ACH2001'] })
    const api = await as(ana)
    const klass = await api.post('/api/events').send(body({ scope: 'class', scopeValue: 'ACH2001', kind: 'exam' }))
    expect(klass.status).toBe(201)
    expect(klass.body.event).toMatchObject({ status: 'approved', scopeLabel: 'ACH2001', author: { name: 'Ana' } })
    expect(notes(root.id)).toHaveLength(0)
    const usp = await api.post('/api/events').send(body())
    expect(usp.body.event).toMatchObject({ status: 'pending', scopeLabel: 'USP' })
    expect(notes(root.id, 'event_submitted')).toHaveLength(1)
    expect(notes(root.id)[0].payload).toEqual({ eventId: usp.body.event.id, title: 'Semana de recepção' })
    expect(notes(ana.id)).toHaveLength(0)
  })

  it('approves right away for an entity admin and records the reviewer', async () => {
    const ada = student('Ada')
    addMember('dasi', ada.id, 'admin')
    const res = await (await as(ada)).post('/api/events').send(body({ scope: 'entity', scopeValue: 'dasi' }))
    expect(res.status).toBe(201)
    expect(res.body.event).toMatchObject({ status: 'approved', scopeLabel: 'DASI' })
    expect(store.events[0].reviewedBy).toBe(ada.id)
  })

  it('notifies the admins of the entity when a member proposes', async () => {
    const ada = student('Ada')
    const mia = student('Mia')
    addMember('dasi', ada.id, 'admin')
    addMember('dasi', mia.id)
    await (await as(mia)).post('/api/events').send(body({ scope: 'entity', scopeValue: 'dasi' }))
    expect(notes(ada.id, 'event_submitted')[0].entityId).toBe('dasi')
  })

  it('rejects a non-existent entity for the superadmin and invalid payloads', async () => {
    const api = await as(superadmin())
    expect((await api.post('/api/events').send(body({ scope: 'entity', scopeValue: 'nao-existe' }))).status).toBe(400)
    expect((await api.post('/api/events').send(body({ title: '' }))).status).toBe(400)
  })

  it('blocks the 11th submission of the day with 429', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const api = await as(ana)
    for (let i = 0; i < 10; i++) expect((await api.post('/api/events').send(body({ scope: 'class', scopeValue: 'ACH2001' }))).status).toBe(201)
    const res = await api.post('/api/events').send(body({ scope: 'class', scopeValue: 'ACH2001' }))
    expect(res.status).toBe(429)
    expect(res.body.error).toBe('Limite de 10 eventos por dia')
  })
})

describe('GET /api/events', () => {
  it('hides other people\'s pending, rejected, cancelled and hidden events but shows the author their own pending', async () => {
    const ana = student('Ana')
    const bia = student('Bia')
    await seed({ title: 'Publicado' })
    const pending = await seed({ status: 'pending', createdBy: ana.id })
    await seed({ status: 'rejected', createdBy: ana.id })
    await seed({ status: 'cancelled', createdBy: ana.id })
    await seed({ status: 'hidden', createdBy: ana.id })
    const other = (await (await as(bia)).get(`/api/events?${RANGE()}`)).body.events
    expect(other.map((e: { title: string }) => e.title)).toEqual(['Publicado'])
    const own = (await (await as(ana)).get(`/api/events?${RANGE()}`)).body.events as { id: string; status: string }[]
    expect(own.map((e) => e.status).sort()).toEqual(['approved', 'hidden', 'pending'])
    expect(own.some((e) => e.id === pending.id)).toBe(true)
  })

  it('keeps members-only events away from non-members', async () => {
    const mia = student('Mia')
    const zeca = student('Zeca')
    addMember('dasi', mia.id)
    const secret = await seed({ scope: 'entity', scopeValue: 'dasi', visibility: 'members' })
    expect(await ids(await as(mia))).toContain(secret.id)
    expect(await ids(await as(zeca))).not.toContain(secret.id)
  })

  it('shows other classes only with the filter on', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const mine = await seed({ scope: 'class', scopeValue: 'ACH2001' })
    const theirs = await seed({ scope: 'class', scopeValue: 'MAC0110' })
    const api = await as(ana)
    expect(await ids(api)).toEqual([mine.id])
    const res = await api.get(`/api/events?${RANGE()}&otherClasses=1`)
    expect(res.body.events.map((e: { id: string }) => e.id).sort()).toEqual([mine.id, theirs.id].sort())
  })

  it('shows moderators pending events of their own entity only', async () => {
    const ada = student('Ada')
    addMember('dasi', ada.id, 'admin')
    const mine = await seed({ scope: 'entity', scopeValue: 'dasi', status: 'pending' })
    await seed({ scope: 'entity', scopeValue: 'atletica', status: 'pending' })
    expect(await ids(await as(ada))).toEqual([mine.id])
  })

  it('validates the range', async () => {
    const api = await as(student('Ana'))
    expect((await api.get('/api/events')).status).toBe(400)
    expect((await api.get(`/api/events?from=${encodeURIComponent(future(0))}&to=${encodeURIComponent(future(200))}`)).status).toBe(400)
  })
})

describe('GET /api/events/:id', () => {
  it('returns a visible event and keeps the fixed routes ahead of :id', async () => {
    const ana = student('Ana')
    const event = await seed({ title: 'Palestra' })
    const api = await as(ana)
    const res = await api.get(`/api/events/${event.id}`)
    expect(res.status).toBe(200)
    expect(res.body.event).toMatchObject({ id: event.id, title: 'Palestra' })
    expect((await api.get('/api/events/scopes')).body.scopes).toBeDefined()
    expect((await api.get('/api/events/mine')).body.events).toBeDefined()
  })

  it('answers 404 to missing, hidden and malformed ids', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    const pending = await seed({ status: 'pending', createdBy: null })
    expect((await api.get(`/api/events/${pending.id}`)).status).toBe(404)
    expect((await api.get('/api/events/nao-e-uuid')).status).toBe(404)
  })

  it('shows another class only with otherClasses=1', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const event = await seed({ scope: 'class', scopeValue: 'ACH9999' })
    const api = await as(ana)
    expect((await api.get(`/api/events/${event.id}`)).status).toBe(404)
    expect((await api.get(`/api/events/${event.id}?otherClasses=1`)).status).toBe(200)
  })

  it('hides members-only events from non-members', async () => {
    const event = await seed({ scope: 'entity', scopeValue: 'dasi', visibility: 'members' })
    expect((await (await as(student('Zeca'))).get(`/api/events/${event.id}`)).status).toBe(404)
  })
})

describe('GET /api/events/scopes', () => {
  it('lists where the student can propose and which need approval', async () => {
    const ana = student('Ana', { courses: ['ACH2001'], campus: 'EACH' })
    addMember('dasi', ana.id)
    const adaScopes = (await (await as(ana)).get('/api/events/scopes')).body.scopes as { scope: string; scopeValue: string | null; label: string; moderated: boolean }[]
    expect(adaScopes.map((s) => s.scope)).toEqual(['usp', 'campus', 'course', 'cohort', 'class', 'entity'])
    expect(adaScopes.find((s) => s.scope === 'class')).toMatchObject({ scopeValue: 'ACH2001', moderated: false })
    expect(adaScopes.find((s) => s.scope === 'entity')).toMatchObject({ scopeValue: 'dasi', label: 'DASI', moderated: true })
    expect(adaScopes.find((s) => s.scope === 'cohort')).toMatchObject({ scopeValue: '2024', label: 'Turma de 2024' })
  })
})

describe('PATCH /api/events/:id', () => {
  const entityEvent = async () => {
    const mia = student('Mia')
    const ada = student('Ada')
    addMember('dasi', mia.id)
    addMember('dasi', ada.id, 'admin')
    const event = await seed({ scope: 'entity', scopeValue: 'dasi', createdBy: mia.id, title: 'Reunião' })
    return { mia, ada, event }
  }

  it('applies free text directly but parks a title change in pendingChanges', async () => {
    const { mia, ada, event } = await entityEvent()
    const zeca = student('Zeca')
    const api = await as(mia)
    const res = await api.patch(`/api/events/${event.id}`).send({ title: 'Reunião geral', location: 'Sala 3' })
    expect(res.status).toBe(200)
    expect(res.body.event).toMatchObject({ title: 'Reunião', location: 'Sala 3', pendingChanges: { title: 'Reunião geral' } })
    const seen = (await (await as(zeca)).get(`/api/events?${RANGE()}`)).body.events[0]
    expect(seen).toMatchObject({ title: 'Reunião', pendingChanges: null })
    expect(notes(ada.id, 'event_submitted')[0].payload).toMatchObject({ editOnly: true, title: 'Reunião geral' })
  })

  it('lets the moderator edit titles directly', async () => {
    const { ada, event } = await entityEvent()
    const res = await (await as(ada)).patch(`/api/events/${event.id}`).send({ title: 'Reunião geral' })
    expect(res.body.event).toMatchObject({ title: 'Reunião geral', pendingChanges: null })
  })

  it('refuses to change the scope, members on non-entity events and inconsistent dates', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: ana.id, startsAt: future(5), endsAt: future(5, 2) })
    const api = await as(ana)
    expect((await api.patch(`/api/events/${event.id}`).send({ scope: 'usp' })).status).toBe(400)
    expect((await api.patch(`/api/events/${event.id}`).send({ visibility: 'members' })).status).toBe(400)
    expect((await api.patch(`/api/events/${event.id}`).send({ startsAt: future(6), allDay: false })).status).toBe(400)
    expect((await api.patch(`/api/events/${event.id}`).send({ endsAt: future(60), allDay: false })).status).toBe(400)
  })

  it('answers 404 to people who cannot see it and 403 to those who can but may not edit', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const bia = student('Bia', { courses: ['ACH2001'] })
    const zeca = student('Zeca')
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: ana.id })
    expect((await (await as(zeca)).patch(`/api/events/${event.id}`).send({ location: 'x' })).status).toBe(404)
    expect((await (await as(bia)).patch(`/api/events/${event.id}`).send({ location: 'x' })).status).toBe(403)
  })

  it('answers 404 to a malformed id', async () => {
    const api = await as(student('Ana'))
    expect((await api.patch('/api/events/nao-e-uuid').send({ location: 'x' })).status).toBe(404)
  })
})

describe('cancel and mine', () => {
  it('lets the author cancel, lists it in /mine and refuses a second cancel', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: ana.id })
    await seed({ scope: 'usp', createdBy: ana.id, status: 'rejected' })
    const api = await as(ana)
    expect((await api.post(`/api/events/${event.id}/cancel`).send({})).status).toBe(204)
    expect((await api.post(`/api/events/${event.id}/cancel`).send({})).status).toBe(403)
    const mine = (await api.get('/api/events/mine')).body.events as { status: string }[]
    expect(mine.map((e) => e.status).sort()).toEqual(['cancelled', 'rejected'])
  })

  it('does not reveal events to outsiders', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: ana.id })
    expect((await (await as(student('Zeca'))).post(`/api/events/${event.id}/cancel`).send({})).status).toBe(404)
    expect((await (await as(student('Zeca'))).post('/api/events/xyz/cancel').send({})).status).toBe(404)
  })
})

describe('review queue', () => {
  it('is closed to non-moderators, with a zero count', async () => {
    const api = await as(student('Ana'))
    expect((await api.get('/api/events/review')).status).toBe(403)
    const count = await api.get('/api/events/review/count')
    expect(count.status).toBe(200)
    expect(count.body).toEqual({ count: 0, moderates: false })
  })

  it('shows each moderator only what they moderate, with the review kind', async () => {
    const root = superadmin()
    const ada = student('Ada')
    addMember('dasi', ada.id, 'admin')
    await seed({ scope: 'entity', scopeValue: 'dasi', status: 'pending', title: 'A' })
    await seed({ scope: 'entity', scopeValue: 'atletica', status: 'pending', title: 'B' })
    await seed({ scope: 'class', scopeValue: 'ACH2001', status: 'hidden', title: 'C' })
    const edited = await seed({ scope: 'entity', scopeValue: 'dasi', title: 'D' })
    store.events.find((e) => e.id === edited.id)!.pendingChanges = { title: 'D2' }
    const adaQueue = (await (await as(ada)).get('/api/events/review')).body.events as { title: string; reviewKind: string }[]
    expect(adaQueue.map((e) => [e.title, e.reviewKind]).sort()).toEqual([['A', 'new'], ['D', 'edit']])
    const rootQueue = (await (await as(root)).get('/api/events/review')).body.events as { title: string; reviewKind: string }[]
    expect(rootQueue).toHaveLength(4)
    expect(rootQueue.find((e) => e.title === 'C')!.reviewKind).toBe('reported')
    expect((await (await as(ada)).get('/api/events/review/count')).body).toEqual({ count: 2, moderates: true })
  })
})

describe('POST /api/events/:id/review', () => {
  const pendingUsp = async () => {
    const ana = student('Ana')
    return { ana, event: await seed({ status: 'pending', createdBy: ana.id, title: 'Recepção' }) }
  }

  it('approves with adjustments and tells the author', async () => {
    const root = superadmin()
    const { ana, event } = await pendingUsp()
    const res = await (await as(root)).post(`/api/events/${event.id}/review`).send({ decision: 'approve', changes: { title: 'Recepção 2026' } })
    expect(res.status).toBe(200)
    expect(res.body.event).toMatchObject({ status: 'approved', title: 'Recepção 2026' })
    expect(notes(ana.id, 'event_approved')[0].payload).toEqual({ eventId: event.id, title: 'Recepção 2026', adjusted: true })
  })

  it('rejects with a note', async () => {
    const root = superadmin()
    const { ana, event } = await pendingUsp()
    const res = await (await as(root)).post(`/api/events/${event.id}/review`).send({ decision: 'reject', note: 'Fora do escopo' })
    expect(res.body.event).toMatchObject({ status: 'rejected', reviewNote: 'Fora do escopo' })
    expect(notes(ana.id, 'event_rejected')[0].payload).toMatchObject({ note: 'Fora do escopo' })
  })

  it('gives 404 to an admin of another entity and 409 to a second decision with a single notification', async () => {
    const root = superadmin()
    const other = student('Outro')
    addMember('atletica', other.id, 'admin')
    const mia = student('Mia')
    const event = await seed({ scope: 'entity', scopeValue: 'dasi', status: 'pending', createdBy: mia.id })
    expect((await (await as(other)).post(`/api/events/${event.id}/review`).send({ decision: 'approve' })).status).toBe(404)
    const api = await as(root)
    expect((await api.post(`/api/events/${event.id}/review`).send({ decision: 'approve' })).status).toBe(200)
    expect((await api.post(`/api/events/${event.id}/review`).send({ decision: 'reject' })).status).toBe(409)
    expect(notes(mia.id)).toHaveLength(1)
  })

  it('maps a lost race on decideEvent to 409 with no notification', async () => {
    const root = superadmin()
    const { ana, event } = await pendingUsp()
    const db = await import('../test/fakeSocialDb.js')
    const spy = vi.spyOn(db, 'decideEvent').mockResolvedValueOnce(null)
    const res = await (await as(root)).post(`/api/events/${event.id}/review`).send({ decision: 'approve' })
    spy.mockRestore()
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Outra pessoa já decidiu esse evento')
    expect(notes(ana.id)).toHaveLength(0)
  })

  it('applies a pending edit on approve and discards it on reject', async () => {
    const root = superadmin()
    const mia = student('Mia')
    const a = await seed({ scope: 'entity', scopeValue: 'dasi', createdBy: mia.id, title: 'Velho' })
    const b = await seed({ scope: 'entity', scopeValue: 'dasi', createdBy: mia.id, title: 'Outro' })
    store.events.find((e) => e.id === a.id)!.pendingChanges = { title: 'Novo' }
    store.events.find((e) => e.id === b.id)!.pendingChanges = { title: 'Nope' }
    const api = await as(root)
    const ok = await api.post(`/api/events/${a.id}/review`).send({ decision: 'approve' })
    expect(ok.body.event).toMatchObject({ title: 'Novo', pendingChanges: null, status: 'approved' })
    const no = await api.post(`/api/events/${b.id}/review`).send({ decision: 'reject', note: 'Não' })
    expect(no.body.event).toMatchObject({ title: 'Outro', pendingChanges: null, status: 'approved' })
    expect(notes(mia.id, 'event_approved')[0].payload).toMatchObject({ editOnly: true })
    expect(notes(mia.id, 'event_rejected')[0].payload).toMatchObject({ editOnly: true, note: 'Não' })
  })

  it('restores (clearing reports) and removes hidden events silently', async () => {
    const root = superadmin()
    const ana = student('Ana')
    const keep = await seed({ scope: 'class', scopeValue: 'ACH2001', status: 'hidden', createdBy: ana.id })
    const drop = await seed({ scope: 'class', scopeValue: 'ACH2001', status: 'hidden', createdBy: ana.id })
    store.eventReports.push({ eventId: keep.id, userId: 'x', reason: null })
    const api = await as(root)
    expect((await api.post(`/api/events/${keep.id}/review`).send({ decision: 'restore' })).body.event.status).toBe('approved')
    expect((await api.post(`/api/events/${drop.id}/review`).send({ decision: 'remove' })).body.event.status).toBe('cancelled')
    expect(store.eventReports).toHaveLength(0)
    expect(notes(ana.id)).toHaveLength(0)
    expect((await api.post(`/api/events/${keep.id}/review`).send({ decision: 'remove' })).status).toBe(409)
  })

  it('answers 404 to a malformed id and 400 to a bad decision', async () => {
    const api = await as(superadmin())
    expect((await api.post('/api/events/xyz/review').send({ decision: 'approve' })).status).toBe(404)
    const { event } = await pendingUsp()
    expect((await api.post(`/api/events/${event.id}/review`).send({ decision: 'zzz' })).status).toBe(400)
  })
})

describe('POST /api/events/:id/report', () => {
  const setup = async () => {
    const root = superadmin()
    const author = student('Autor', { courses: ['ACH2001'] })
    const mates = [1, 2, 3, 4].map((i) => student(`Colega${i}`, { courses: ['ACH2001'] }))
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: author.id, title: 'Prova' })
    return { root, author, mates, event }
  }

  it('hides on the 3rd report once, notifying the author and the superadmin, and ignores a 4th', async () => {
    const { root, author, mates, event } = await setup()
    for (const mate of mates.slice(0, 2)) expect((await (await as(mate)).post(`/api/events/${event.id}/report`).send({})).body).toEqual({ reported: true, hidden: false })
    const third = await (await as(mates[2])).post(`/api/events/${event.id}/report`).send({ reason: 'spam' })
    expect(third.body).toEqual({ reported: true, hidden: true })
    expect(notes(author.id, 'event_hidden')).toHaveLength(1)
    expect(notes(root.id, 'event_hidden')[0].payload).toMatchObject({ forModerator: true })
    const fourth = await (await as(mates[3])).post(`/api/events/${event.id}/report`).send({})
    expect(fourth.status).toBe(404)
    expect(notes(author.id, 'event_hidden')).toHaveLength(1)
    expect(notes(root.id, 'event_hidden')).toHaveLength(1)
  })

  it('counts a duplicate report once and flags reportedByMe', async () => {
    const { mates, event } = await setup()
    const api = await as(mates[0])
    await api.post(`/api/events/${event.id}/report`).send({})
    const again = await api.post(`/api/events/${event.id}/report`).send({})
    expect(again.body).toEqual({ reported: true, hidden: false })
    expect(store.eventReports).toHaveLength(1)
    const listed = (await api.get(`/api/events?${RANGE()}`)).body.events[0]
    expect(listed).toMatchObject({ reportedByMe: true, permissions: { report: false } })
  })

  it('refuses the author, and hides the event from people outside the class', async () => {
    const { author, event } = await setup()
    expect((await (await as(author)).post(`/api/events/${event.id}/report`).send({})).status).toBe(403)
    expect((await (await as(student('Zeca'))).post(`/api/events/${event.id}/report`).send({})).status).toBe(404)
    expect((await (await as(author)).post('/api/events/xyz/report').send({})).status).toBe(404)
  })
})

describe('PUT /api/events/:id/rsvp', () => {
  const put = (api: Awaited<ReturnType<typeof as>>, id: string, payload: unknown) => api.put(`/api/events/${id}/rsvp`).send(payload as object)

  it('counts going and interested, swaps without double counting and clears on null', async () => {
    const [ana, bia, caio] = ['Ana', 'Bia', 'Caio'].map((name) => student(name))
    const event = await seed({})
    const a = await as(ana)
    expect((await put(a, event.id, { status: 'going' })).body).toEqual({ rsvp: { going: 1, interested: 0, mine: 'going' } })
    expect((await put(await as(bia), event.id, { status: 'going' })).body.rsvp).toEqual({ going: 2, interested: 0, mine: 'going' })
    expect((await put(await as(caio), event.id, { status: 'interested' })).body.rsvp).toEqual({ going: 2, interested: 1, mine: 'interested' })
    expect((await put(a, event.id, { status: 'interested' })).body.rsvp).toEqual({ going: 1, interested: 2, mine: 'interested' })
    expect(store.eventRsvps.filter((r) => r.userId === ana.id)).toHaveLength(1)
    expect((await put(a, event.id, { status: null })).body.rsvp).toEqual({ going: 1, interested: 1, mine: null })
    const listed = (await a.get(`/api/events?${RANGE()}`)).body.events[0]
    expect(listed.rsvp).toEqual({ going: 1, interested: 1, mine: null })
  })

  it('never returns ids or names of other people', async () => {
    const ana = student('Ana')
    const bia = student('Bia')
    const event = await seed({ createdBy: ana.id })
    await put(await as(bia), event.id, { status: 'going' })
    const res = await put(await as(ana), event.id, { status: 'going' })
    expect(Object.keys(res.body)).toEqual(['rsvp'])
    expect(Object.keys(res.body.rsvp).sort()).toEqual(['going', 'interested', 'mine'])
    const text = JSON.stringify([res.body, (await (await as(ana)).get(`/api/events/${event.id}`)).body.event.rsvp])
    expect(text).not.toContain(bia.id)
    expect(text).not.toContain('Bia')
  })

  it('answers 404 to someone who cannot see the event, with nothing stored', async () => {
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001' })
    const res = await put(await as(student('Zeca')), event.id, { status: 'going' })
    expect(res.status).toBe(404)
    expect(store.eventRsvps).toHaveLength(0)
    expect((await put(await as(student('Zé')), 'xyz', { status: 'going' })).status).toBe(404)
  })

  it('answers 409 for past, pending and hidden events', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    const past = await seed({ startsAt: future(-3), endsAt: future(-2) })
    const res = await put(api, past.id, { status: 'going' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Esse evento já passou')
    const ongoing = await seed({ startsAt: future(-1), endsAt: future(1) })
    expect((await put(api, ongoing.id, { status: 'going' })).status).toBe(200)
    const pending = await seed({ status: 'pending', createdBy: ana.id })
    expect((await put(api, pending.id, { status: 'going' })).status).toBe(409)
    const hidden = await seed({ status: 'hidden', createdBy: ana.id })
    expect((await put(api, hidden.id, { status: 'going' })).status).toBe(409)
  })

  it('rejects unknown keys and bad statuses with 400', async () => {
    const api = await as(student('Ana'))
    const event = await seed({})
    expect((await put(api, event.id, { status: 'going', remind: true })).status).toBe(400)
    expect((await put(api, event.id, { status: 'maybe' })).status).toBe(400)
    expect((await put(api, event.id, {})).status).toBe(400)
    expect(store.eventRsvps).toHaveLength(0)
  })
})

describe('DTO', () => {
  it('has no raw user ids and exposes permissions', async () => {
    const ana = student('Ana', { courses: ['ACH2001'] })
    const event = await seed({ scope: 'class', scopeValue: 'ACH2001', createdBy: ana.id })
    const res = await (await as(ana)).get(`/api/events?${RANGE()}`)
    const dto = res.body.events[0]
    expect(dto.id).toBe(event.id)
    expect(dto).not.toHaveProperty('createdBy')
    expect(dto).not.toHaveProperty('reviewedBy')
    expect(JSON.stringify(dto)).not.toContain(ana.id)
    expect(dto.permissions).toEqual({ edit: true, cancel: true, report: false, moderate: false })
  })
})
