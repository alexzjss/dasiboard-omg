import { beforeEach, describe, expect, it } from 'vitest'
import * as db from '../test/fakeSocialDb.js'
import type { EventFields } from '../events/types.js'

const fields = (over: Partial<EventFields> = {}): EventFields => ({
  title: 'Prova', description: null, kind: 'exam', startsAt: '2026-11-10T12:00:00.000Z', endsAt: null, allDay: false,
  location: null, link: null, visibility: 'public', ...over,
})
const noFilter = { classCodes: [], entityIds: [], includeOtherClasses: false, viewerId: 'nobody', moderatesAll: false, moderatedEntityIds: [] }
const make = (over: Partial<EventFields> = {}, status: 'pending' | 'approved' = 'approved', createdBy: string | null = null, scope: 'usp' | 'class' | 'entity' = 'usp', scopeValue: string | null = null) =>
  db.createEvent({ ...fields(over), scope, scopeValue, status, createdBy })

beforeEach(() => db.resetStore())

describe('listEventsInRange', () => {
  it('returns events that intersect the range, including ones that start before it', async () => {
    const before = await make({ startsAt: '2026-11-01T10:00:00.000Z', endsAt: '2026-11-05T10:00:00.000Z' })
    await make({ startsAt: '2026-11-01T10:00:00.000Z', endsAt: '2026-11-02T10:00:00.000Z' })
    const inside = await make({ startsAt: '2026-11-06T10:00:00.000Z' })
    await make({ startsAt: '2026-11-08T00:00:00.000Z' }) // starts exactly at `to`
    const found = await db.listEventsInRange('2026-11-04T00:00:00.000Z', '2026-11-08T00:00:00.000Z', noFilter)
    expect(found.map((e) => e.id)).toEqual([before.id, inside.id])
  })

  it('hides pending/cancelled of others but keeps own and moderated ones', async () => {
    const mine = await make({}, 'pending', 'me')
    const theirs = await make({}, 'pending', 'other')
    const cancelled = await make({}, 'pending', 'me')
    await db.cancelEvent(cancelled.id)
    const range: [string, string] = ['2026-11-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z']
    expect((await db.listEventsInRange(...range, { ...noFilter, viewerId: 'me' })).map((e) => e.id)).toEqual([mine.id])
    expect((await db.listEventsInRange(...range, { ...noFilter, moderatesAll: true })).map((e) => e.id).sort()).toEqual([mine.id, theirs.id].sort())
  })
})

describe('listReviewQueue (P9)', () => {
  it('drops pending events in the past, keeps approved with pending changes, hidden only for all', async () => {
    const future = await make({ startsAt: '2026-12-01T00:00:00.000Z' }, 'pending')
    await make({ startsAt: '2026-10-01T00:00:00.000Z' }, 'pending')
    const edited = await make({ startsAt: '2026-12-02T00:00:00.000Z' }, 'approved')
    await db.updateEventFields(edited.id, {}, { title: 'Novo' })
    const hidden = await make({ startsAt: '2026-12-03T00:00:00.000Z' })
    await db.hideEventIfApproved(hidden.id)
    const now = '2026-10-21T00:00:00.000Z'
    expect((await db.listReviewQueue({ all: true, entityIds: [] }, now)).map((e) => e.id)).toEqual([future.id, edited.id, hidden.id])
    expect(await db.listReviewQueue({ all: false, entityIds: [] }, now)).toEqual([])
  })

  it('limits non-superadmins to their entities', async () => {
    const mine = await make({ startsAt: '2026-12-01T00:00:00.000Z' }, 'pending', null, 'entity', 'ent-a')
    await make({ startsAt: '2026-12-01T00:00:00.000Z' }, 'pending', null, 'entity', 'ent-b')
    await make({ startsAt: '2026-12-01T00:00:00.000Z' }, 'pending', null, 'class', 'ACH2001')
    expect((await db.listReviewQueue({ all: false, entityIds: ['ent-a'] }, '2026-10-21T00:00:00.000Z')).map((e) => e.id)).toEqual([mine.id])
  })
})

describe('decideEvent', () => {
  it('is conditional on the expected status: the second decision gets null', async () => {
    const event = await make({}, 'pending', 'author')
    const patch = { status: 'approved' as const, reviewedBy: 'mod', reviewNote: null }
    expect((await db.decideEvent(event.id, 'pending', patch))?.status).toBe('approved')
    expect(await db.decideEvent(event.id, 'pending', { ...patch, status: 'rejected' })).toBeNull()
    expect((await db.getEvent(event.id))?.status).toBe('approved')
  })

  it('applies pending changes decisions only when there are some', async () => {
    const event = await make({}, 'approved')
    const patch = { status: 'approved' as const, reviewedBy: 'mod', reviewNote: null, clearPendingChanges: true }
    expect(await db.decideEvent(event.id, 'approved', patch)).toBeNull()
    await db.updateEventFields(event.id, {}, { title: 'Novo' })
    await db.updateEventFields(event.id, {}, { kind: 'meeting' })
    expect((await db.getEvent(event.id))?.pendingChanges).toEqual({ title: 'Novo', kind: 'meeting' })
    const decided = await db.decideEvent(event.id, 'approved', { ...patch, fields: { title: 'Novo' } })
    expect(decided).toMatchObject({ title: 'Novo', pendingChanges: null })
    expect(await db.decideEvent(event.id, 'approved', patch)).toBeNull()
  })
})

describe('reports', () => {
  it('reportEvent is idempotent per user', async () => {
    const event = await make({}, 'approved', null, 'class', 'ACH2001')
    expect(await db.reportEvent(event.id, 'u1', 'spam')).toEqual({ inserted: true, total: 1 })
    expect(await db.reportEvent(event.id, 'u1', null)).toEqual({ inserted: false, total: 1 })
    expect(await db.reportEvent(event.id, 'u2', null)).toEqual({ inserted: true, total: 2 })
    await db.clearEventReports(event.id)
    expect((await db.reportEvent(event.id, 'u1', null)).total).toBe(1)
  })

  it('hideEventIfApproved is true only once', async () => {
    const event = await make()
    expect(await db.hideEventIfApproved(event.id)).toBe(true)
    expect(await db.hideEventIfApproved(event.id)).toBe(false)
  })
})

describe('misc', () => {
  it('createEvent sets entityId for entity scope and getEvent ignores bad ids', async () => {
    const event = await make({}, 'pending', null, 'entity', 'ent-a')
    expect(await db.getEvent(event.id)).toMatchObject({ scope: 'entity', scopeValue: 'ent-a' })
    expect(await db.getEvent('nope')).toBeNull()
  })

  it('cancelEvent only works on live statuses; counts and my events', async () => {
    const event = await make({}, 'pending', 'me')
    expect(await db.countEventsCreatedSince('me', '2000-01-01T00:00:00.000Z')).toBe(1)
    expect(await db.countEventsCreatedSince('me', '2999-01-01T00:00:00.000Z')).toBe(0)
    expect(await db.cancelEvent(event.id)).toBe(true)
    expect(await db.cancelEvent(event.id)).toBe(false)
    expect((await db.listMyEvents('me')).map((e) => e.id)).toEqual([event.id])
  })

  it('getEventActor reads profile, campus, classes and active memberships; moderators include entity admins', async () => {
    const ana = db.addPerson({ name: 'Ana', handle: 'ana', campus: 'EACH', courses: ['ACH2001'] })
    const bob = db.addPerson({ name: 'Bob', handle: 'bob' })
    db.addEntity('ent-a', 'Entidade A')
    db.addMember('ent-a', ana.id, 'admin')
    db.addMember('ent-a', bob.id)
    db.store.members.find((m) => m.user_id === bob.id)!.left_at = '2026-01-01T00:00:00.000Z'
    const actor = await db.getEventActor(ana.id, false)
    expect(actor).toMatchObject({ userId: ana.id, campus: 'EACH', course: 'Sistemas de Informação', entryYear: 2024, isSuperadmin: false })
    expect([...actor.classCodes]).toEqual(['ACH2001'])
    expect([...actor.memberships]).toEqual([['ent-a', 'admin']])
    expect((await db.getEventActor(bob.id, false)).memberships.size).toBe(0)
    expect(await db.findEventModeratorIds({ scope: 'entity', scopeValue: 'ent-a' })).toEqual([ana.id])
  })
})
