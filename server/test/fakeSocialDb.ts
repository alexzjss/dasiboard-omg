// In-memory stand-in for server/social/db.ts, used with vi.mock in route tests.
import { randomUUID } from 'node:crypto'
import type * as Real from '../social/db.js'
import type * as Self from './fakeSocialDb.js'
import { mergeCard, type CardSettings } from '../social/cardOptions.js'
import type { UnlockStats } from '../social/cardUnlocks.js'
import type { ConnectionRow, Visibility } from '../social/privacy.js'
import { superadminEmails } from '../lib/config.js'
import type { EventFields, EventRecord, EventStatus } from '../events/types.js'

type Row = { user: Real.UserRow; sub: string; profile: Real.ProfileRow }
type Badge = {
  user_id: string; kind: Real.BadgeKind; source_id: string; label: string; revoked_at: string | null
  icon?: string | null; color?: string | null; entity_id?: string | null
}

export const store = {
  people: new Map<string, Row>(),
  connections: [] as ConnectionRow[],
  entities: new Map<string, { id: string; name: string; hash: string | null }>(),
  members: [] as (Real.MembershipRow & { title?: string | null })[],
  badges: [] as Badge[],
  courses: new Map<string, Real.CourseRow[]>(),
  feed: [] as Real.FeedCandidate[],
  schedules: new Set<string>(),
  avatarObjects: new Set<string>(),
  notifications: [] as Real.NotificationRow[],
  pushSubs: [] as Real.PushSubscriptionRow[],
  announcements: [] as (Parameters<typeof Real.createAnnouncement>[0] & { id: string; createdAt: string })[],
  cards: new Map<string, { card: unknown; isPublic: boolean }>(),
  collection: [] as { collectorId: string; collectedId: string; collectedAt?: string }[],
  campus: new Map<string, string>(),
  events: [] as (EventRecord & { entityId: string | null })[],
  eventReports: [] as { eventId: string; userId: string; reason: string | null }[],
  eventRsvps: [] as { eventId: string; userId: string; status: 'going' | 'interested' }[],
}

export function resetStore() {
  store.people.clear(); store.connections = []; store.entities.clear(); store.members = []; store.badges = []; store.courses.clear(); store.feed = []; store.schedules.clear(); store.avatarObjects.clear(); store.notifications = []; store.pushSubs = []; store.announcements = []; store.cards.clear(); store.collection = []; store.campus.clear(); store.events = []; store.eventReports = []; store.eventRsvps = []; definitions.clear()
}

export function addPerson(opts: { name: string; email?: string; handle: string; showCourses?: Visibility; showConnections?: Visibility; course?: string; courses?: string[]; campus?: string }) {
  const id = randomUUID()
  const email = opts.email ?? `${opts.handle}@usp.br`
  const user = { id, email, name: opts.name, picture: null }
  const profile: Real.ProfileRow = {
    user_id: id, handle: opts.handle, bio: null, course: opts.course ?? 'Sistemas de Informação', entry_year: 2024, links: {}, technologies: [],
    show_courses: opts.showCourses ?? 'all', show_connections: opts.showConnections ?? 'all', avatar_path: null,
  }
  store.people.set(id, { user, sub: `sub-${opts.handle}`, profile })
  if (opts.campus) store.campus.set(id, opts.campus)
  if (opts.courses) store.courses.set(id, opts.courses.map((code) => ({ code, title: `Matéria ${code}` })))
  return { id, sub: `sub-${opts.handle}`, email, name: opts.name, handle: opts.handle }
}

export const addEntity = (id: string, name: string, hash: string | null = null) => store.entities.set(id, { id, name, hash })
export const addConnection = (requester: string, addressee: string, status: 'pending' | 'accepted') => store.connections.push({ requester_id: requester, addressee_id: addressee, status })
export function addMember(entityId: string, userId: string, role: Real.Role = 'member') {
  store.members.push({ entity_id: entityId, user_id: userId, role, joined_at: new Date().toISOString(), left_at: null })
  const entity = store.entities.get(entityId)!
  store.badges.push({ user_id: userId, kind: 'entity_member', source_id: entityId, label: entity.name, entity_id: entityId, revoked_at: null })
}

export const avatarPublicUrl = (path: string) => `https://fake.storage/avatars/${path}`
export const addAvatarObject = (path: string) => store.avatarObjects.add(path)
const toRecord = (row: Row): Real.PersonRecord => ({
  user: row.profile.avatar_path ? { ...row.user, picture: avatarPublicUrl(row.profile.avatar_path) } : row.user,
  profile: row.profile,
})
const sameSide = (c: ConnectionRow, a: string, b: string) => (c.requester_id === a && c.addressee_id === b) || (c.requester_id === b && c.addressee_id === a)

export async function getUserBySub(sub: string) { return [...store.people.values()].find((row) => row.sub === sub)?.user ?? null }
export async function setAvatarPath(userId: string, path: string | null) { store.people.get(userId)!.profile.avatar_path = path }
export async function createAvatarUploadUrl(path: string) { return { signedUrl: `https://fake.storage/upload/${path}`, token: 'fake-token' } }
export async function avatarObjectExists(path: string) { return store.avatarObjects.has(path) }
export async function removeAvatarObjects(userId: string, keep: string | null) {
  for (const path of [...store.avatarObjects]) if (path.startsWith(`${userId}/`) && path !== keep) store.avatarObjects.delete(path)
}
export async function getPersonById(userId: string) { const row = store.people.get(userId); return row ? toRecord(row) : null }
export async function getPersonByHandle(handle: string) { const row = [...store.people.values()].find((r) => r.profile.handle === handle); return row ? toRecord(row) : null }
export async function getPeopleByIds(ids: string[]) { return ids.flatMap((id) => { const row = store.people.get(id); return row ? [toRecord(row)] : [] }) }
export async function ensureViewerProfile(userId: string) { return getPersonById(userId) }
export async function updateProfile(userId: string, patch: Real.ProfilePatch) { Object.assign(store.people.get(userId)!.profile, patch) }

export async function searchPeople(filters: Real.PeopleSearch) {
  return [...store.people.values()]
    .filter((row) => row.user.id !== filters.excludeUserId)
    .filter((row) => !filters.userIds || filters.userIds.includes(row.user.id))
    .filter((row) => !filters.q || row.user.name.toLowerCase().includes(filters.q.toLowerCase()))
    .filter((row) => !filters.curso || row.profile.course === filters.curso)
    .filter((row) => !filters.ano || row.profile.entry_year === filters.ano)
    .filter((row) => !filters.cursor || row.profile.handle > filters.cursor)
    .sort((a, b) => (a.profile.handle < b.profile.handle ? -1 : 1))
    .slice(0, filters.limit).map(toRecord)
}

export async function getCourses(userId: string) { return store.courses.get(userId) ?? [] }
export async function getCoursesByUsers(ids: string[]) { return new Map(ids.map((id) => [id, store.courses.get(id) ?? []])) }
export async function findUserIdsByCourse(code: string) { return [...store.courses].filter(([, list]) => list.some((c) => c.code === code)).map(([id]) => id) }
export async function findUserIdsByCourses(codes: string[], exclude: string[]) {
  return [...store.courses].filter(([id, list]) => !exclude.includes(id) && list.some((c) => codes.includes(c.code))).map(([id]) => id)
}

export async function getConnection(a: string, b: string) { return store.connections.find((c) => sameSide(c, a, b)) ?? null }
export async function getConnectionsWith(viewerId: string, others: string[]) {
  return store.connections.filter((c) => (c.requester_id === viewerId && others.includes(c.addressee_id)) || (c.addressee_id === viewerId && others.includes(c.requester_id)))
}
export async function createConnection(requester: string, addressee: string) {
  if (store.connections.some((c) => sameSide(c, requester, addressee))) return 'exists' as const
  store.connections.push({ requester_id: requester, addressee_id: addressee, status: 'pending' })
  return 'created' as const
}
export async function acceptConnection(requester: string, addressee: string) {
  const row = store.connections.find((c) => c.requester_id === requester && c.addressee_id === addressee && c.status === 'pending')
  if (row) row.status = 'accepted'
  return !!row
}
export async function deleteConnection(a: string, b: string) { store.connections = store.connections.filter((c) => !sameSide(c, a, b)) }
export async function listPendingReceived(userId: string) {
  const rows = store.connections.filter((c) => c.addressee_id === userId && c.status === 'pending')
  return rows.map((c) => ({ person: toRecord(store.people.get(c.requester_id)!), createdAt: '2026-10-20T00:00:00Z' }))
}
export async function countPendingReceived(userId: string) { return store.connections.filter((c) => c.addressee_id === userId && c.status === 'pending').length }
export async function listConnectedIds(userId: string) {
  return store.connections.filter((c) => c.status === 'accepted' && (c.requester_id === userId || c.addressee_id === userId)).map((c) => (c.requester_id === userId ? c.addressee_id : c.requester_id))
}
export async function listConnectionsOf(userId: string) { return getPeopleByIds(await listConnectedIds(userId)) }

export async function getEntity(id: string) { const e = store.entities.get(id); return e ? { id: e.id, name: e.name } : null }
export async function findEntityByCodeHash(hash: string) { const e = [...store.entities.values()].find((x) => x.hash === hash); return e ? { id: e.id, name: e.name } : null }
export async function setEntityCodeHash(entityId: string, hash: string) { store.entities.get(entityId)!.hash = hash }
export async function getMembership(entityId: string, userId: string) { return store.members.find((m) => m.entity_id === entityId && m.user_id === userId) ?? null }
export const isActiveMember = (m: Real.MembershipRow | null): m is Real.MembershipRow => !!m && m.left_at === null
export async function joinEntity(entity: Real.EntityRow, userId: string) {
  store.members = store.members.filter((m) => !(m.entity_id === entity.id && m.user_id === userId))
  store.members.push({ entity_id: entity.id, user_id: userId, role: 'member', joined_at: new Date().toISOString(), left_at: null })
  store.badges = store.badges.filter((b) => !(b.user_id === userId && b.kind === 'entity_member' && b.source_id === entity.id))
  store.badges.push({ user_id: userId, kind: 'entity_member', source_id: entity.id, label: entity.name, entity_id: entity.id, revoked_at: null })
}
export async function leaveEntity(entityId: string, userId: string) {
  const m = store.members.find((x) => x.entity_id === entityId && x.user_id === userId)
  if (m) { m.left_at = new Date().toISOString(); m.role = 'member' }
  for (const b of store.badges) if (b.user_id === userId && b.kind === 'entity_member' && b.source_id === entityId) b.revoked_at = new Date().toISOString()
}
export async function setMemberRole(entityId: string, userId: string, role: Real.Role) {
  const m = store.members.find((x) => x.entity_id === entityId && x.user_id === userId && x.left_at === null)
  if (m) m.role = role
}
export async function setMemberTitle(entityId: string, userId: string, title: string | null) {
  const m = store.members.find((x) => x.entity_id === entityId && x.user_id === userId && x.left_at === null)
  if (m) m.title = title
}
export async function listMembers(entityId: string) {
  return store.members.filter((m) => m.entity_id === entityId && m.left_at === null).map((m) => ({ person: toRecord(store.people.get(m.user_id)!), role: m.role, joinedAt: m.joined_at, title: m.title ?? null }))
}
export async function listMembershipsOf(userId: string) {
  return store.members.filter((m) => m.user_id === userId && m.left_at === null).map((m) => ({ entityId: m.entity_id, name: store.entities.get(m.entity_id)!.name, role: m.role, joinedAt: m.joined_at, title: m.title ?? null }))
}
export async function listMembershipsOfMany(userIds: string[]) {
  const result = new Map<string, { entityId: string; name: string; title: string | null }[]>()
  for (const id of userIds) result.set(id, (await listMembershipsOf(id)).map(({ entityId, name, title }) => ({ entityId, name, title })))
  return result
}
export async function getBadges(ids: string[]) {
  const result = new Map<string, Real.BadgeRow[]>()
  for (const b of store.badges) if (ids.includes(b.user_id) && !b.revoked_at) result.set(b.user_id, [...(result.get(b.user_id) ?? []), { kind: b.kind, sourceId: b.source_id, label: b.label, icon: b.icon ?? null, color: b.color ?? null, entityId: b.kind === 'entity_member' ? b.source_id : (b.entity_id ?? null) }])
  return result
}
export async function awardBadge(userId: string, badge: Real.BadgeInput) {
  const found = store.badges.find((b) => b.user_id === userId && b.kind === badge.kind && b.source_id === badge.sourceId)
  if (found && !found.revoked_at) return 'exists' as const
  if (found) store.badges.splice(store.badges.indexOf(found), 1)
  store.badges.push({ user_id: userId, kind: badge.kind, source_id: badge.sourceId, label: badge.label, icon: badge.icon ?? null, color: badge.color ?? null, entity_id: badge.entityId ?? null, revoked_at: null })
  return 'awarded' as const
}
export async function revokeBadge(userId: string, kind: Real.BadgeKind, sourceId: string) {
  const found = store.badges.find((b) => b.user_id === userId && b.kind === kind && b.source_id === sourceId && !b.revoked_at)
  if (found) found.revoked_at = new Date().toISOString()
  return !!found
}
const definitions = new Map<string, Real.BadgeDefinition & { archived: boolean }>()
export async function listBadgeDefinitions(filter: { kind: 'admin_award' } | { entityId: string }) {
  return [...definitions.values()].filter((d) => !d.archived && ('entityId' in filter ? d.kind === 'entity_award' && d.entityId === filter.entityId : d.kind === 'admin_award')).map(({ archived: _archived, ...d }) => d)
}
export async function getBadgeDefinition(id: string) {
  const found = definitions.get(id)
  if (!found || found.archived) return null
  const { archived: _archived, ...d } = found
  return d
}
export async function createBadgeDefinition(input: Omit<Real.BadgeDefinition, 'id'> & { createdBy: string }) {
  const { createdBy: _createdBy, ...rest } = input
  const definition = { id: randomUUID(), ...rest }
  definitions.set(definition.id, { ...definition, archived: false })
  return definition
}
export async function archiveBadgeDefinition(id: string) { const found = definitions.get(id); if (found) found.archived = true }

export async function getAchievementStats(userId: string): Promise<Real.AchievementStats> {
  const profile = store.people.get(userId)?.profile
  const hasLink = Object.values(profile?.links ?? {}).some((value) => typeof value === 'string' && value.trim() !== '')
  return {
    profileComplete: !!profile?.bio?.trim() && profile.entry_year !== null && hasLink,
    connections: store.connections.filter((c) => c.status === 'accepted' && (c.requester_id === userId || c.addressee_id === userId)).length,
    scheduleImported: store.schedules.has(userId),
    collected: await countCollected(userId),
    entryYear: profile?.entry_year ?? null,
    course: profile?.course ?? '',
  }
}
export async function getCardSettings(userId: string) {
  const row = store.cards.get(userId)
  return { settings: mergeCard(row?.card), isPublic: row?.isPublic === true }
}
export async function getCardSettingsMany(userIds: string[]) {
  return new Map(await Promise.all(userIds.map(async (id) => [id, await getCardSettings(id)] as const)))
}
export async function updateCard(userId: string, patch: { settings?: CardSettings; public?: boolean }) {
  const row = store.cards.get(userId) ?? { card: {}, isPublic: false }
  if (patch.settings) row.card = patch.settings
  if (patch.public !== undefined) row.isPublic = patch.public
  store.cards.set(userId, row)
}
export async function countCollected(userId: string) { return store.collection.filter((c) => c.collectorId === userId).length }
export async function isCollected(collectorId: string, collectedId: string) { return store.collection.some((c) => c.collectorId === collectorId && c.collectedId === collectedId) }
export async function collectCard(collectorId: string, collectedId: string): Promise<'collected' | 'exists'> {
  if (await isCollected(collectorId, collectedId)) return 'exists'
  store.collection.push({ collectorId, collectedId, collectedAt: new Date().toISOString() })
  return 'collected'
}
export async function uncollectCard(collectorId: string, collectedId: string) {
  store.collection = store.collection.filter((c) => !(c.collectorId === collectorId && c.collectedId === collectedId))
}
export async function listCollection(collectorId: string, before: { at: string; id: string } | null, limit: number) {
  const at = (c: { collectedAt?: string }) => c.collectedAt ?? '1970-01-01T00:00:00.000Z'
  return store.collection
    .filter((c) => c.collectorId === collectorId && (!before || at(c) < before.at || (at(c) === before.at && c.collectedId < before.id)))
    .sort((a, b) => (at(a) === at(b) ? (a.collectedId < b.collectedId ? 1 : -1) : at(a) < at(b) ? 1 : -1))
    .slice(0, limit)
    .flatMap((c) => { const row = store.people.get(c.collectedId); return row ? [{ person: toRecord(row), collectedAt: at(c) }] : [] })
}
export async function getUnlockStats(userId: string): Promise<UnlockStats> {
  const own = (await getBadges([userId])).get(userId) ?? []
  const memberships = await listMembershipsOf(userId)
  return {
    badgeCount: own.filter((badge) => badge.kind !== 'entity_member').length,
    hasTitle: memberships.some((membership) => !!membership.title),
    connections: (await getAchievementStats(userId)).connections,
    hasAdminAward: own.some((badge) => badge.kind === 'admin_award'),
    collected: await countCollected(userId),
    entityIds: memberships.map((membership) => membership.entityId),
  }
}
export async function findUserIdsByEntity(entityId: string) { return store.members.filter((m) => m.entity_id === entityId && m.left_at === null).map((m) => m.user_id) }
export async function listFeedCandidates() { return store.feed }

let notificationSeq = 0
export async function insertNotifications(userIds: string[], input: Real.NotificationInput) {
  const rows = [...new Set(userIds)].map((userId): Real.NotificationRow => ({
    id: randomUUID(), userId, type: input.type, actorId: input.actorId ?? null, entityId: input.entityId ?? null, payload: input.payload ?? {},
    createdAt: new Date(Date.UTC(2026, 9, 20) + ++notificationSeq * 1000).toISOString(), readAt: null,
  }))
  store.notifications.push(...rows)
  return rows
}
export async function listNotifications(userId: string, before: { at: string; id: string } | null, limit: number) {
  return store.notifications
    .filter((n) => n.userId === userId && (!before || n.createdAt < before.at || (n.createdAt === before.at && n.id < before.id)))
    .sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}
export async function countUnread(userId: string) { return store.notifications.filter((n) => n.userId === userId && n.readAt === null).length }
export async function markRead(userId: string, id: string) {
  const found = store.notifications.find((n) => n.id === id && n.userId === userId)
  if (found && found.readAt === null) found.readAt = new Date().toISOString()
  return !!found
}
export async function markAllRead(userId: string) {
  for (const n of store.notifications) if (n.userId === userId && n.readAt === null) n.readAt = new Date().toISOString()
}
export async function getEntitiesByIds(ids: string[]) { return ids.flatMap((id) => { const e = store.entities.get(id); return e ? [{ id: e.id, name: e.name }] : [] }) }

export async function savePushSubscription(userId: string, sub: Real.PushSubscriptionInput) {
  const existing = store.pushSubs.find((s) => s.endpoint === sub.endpoint)
  if (existing) { existing.userId = userId; existing.keys = sub.keys } else store.pushSubs.push({ id: randomUUID(), userId, endpoint: sub.endpoint, keys: sub.keys })
}
export async function deletePushSubscription(userId: string, endpoint: string) { store.pushSubs = store.pushSubs.filter((s) => !(s.userId === userId && s.endpoint === endpoint)) }
export async function listPushSubscriptions(userIds: string[]) { return store.pushSubs.filter((s) => userIds.includes(s.userId)) }
export async function deletePushSubscriptionById(id: string) { store.pushSubs = store.pushSubs.filter((s) => s.id !== id) }

export async function resolveAudience(audience: Real.Audience, value: string | null) {
  if (audience === 'entity') return findUserIdsByEntity(value ?? '')
  return [...store.people.values()]
    .filter((row) => audience === 'all' || (audience === 'course' ? row.profile.course === value : row.profile.entry_year === Number(value)))
    .map((row) => row.user.id).slice(0, 5000)
}
export async function createAnnouncement(input: Parameters<typeof Real.createAnnouncement>[0]) {
  const id = randomUUID()
  store.announcements.push({ ...input, id, createdAt: new Date().toISOString() })
  return { id }
}
export async function countEntityAnnouncementsSince(entityId: string, sinceIso: string) {
  return store.announcements.filter((a) => a.entityId === entityId && a.createdAt >= sinceIso).length
}

// ---------- calendar events ----------

const byStart = (a: EventRecord, b: EventRecord) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : a.id < b.id ? -1 : 1)
const clone = (event: EventRecord): EventRecord => { const { entityId: _entityId, ...rest } = event as EventRecord & { entityId?: unknown }; return { ...rest, pendingChanges: rest.pendingChanges ? { ...rest.pendingChanges } : null } }
const findEvent = (id: string) => store.events.find((e) => e.id === id)

export async function getEventActor(userId: string, isSuperadmin: boolean) {
  const profile = store.people.get(userId)?.profile
  return {
    userId, isSuperadmin,
    campus: store.campus.get(userId) ?? null, course: profile?.course ?? null, entryYear: profile?.entry_year ?? null,
    classCodes: new Set((store.courses.get(userId) ?? []).map((c) => c.code)) as ReadonlySet<string>,
    memberships: new Map(store.members.filter((m) => m.user_id === userId && m.left_at === null).map((m) => [m.entity_id, m.role] as const)) as ReadonlyMap<string, 'member' | 'admin'>,
  }
}

export async function createEvent(input: Parameters<typeof Real.createEvent>[0]): Promise<EventRecord> {
  const now = new Date().toISOString()
  const event: EventRecord & { entityId: string | null } = {
    id: randomUUID(), title: input.title, description: input.description, kind: input.kind, scope: input.scope, scopeValue: input.scopeValue,
    visibility: input.visibility, startsAt: input.startsAt, endsAt: input.endsAt, allDay: input.allDay, location: input.location, link: input.link,
    status: input.status, pendingChanges: null, source: input.source ?? 'user', createdBy: input.createdBy,
    reviewedBy: input.reviewedBy ?? null, reviewedAt: input.reviewedBy ? now : null, reviewNote: null, createdAt: now, updatedAt: now,
    entityId: input.scope === 'entity' ? input.scopeValue : null,
  }
  store.events.push(event)
  return clone(event)
}
export async function getEvent(id: string) { const found = findEvent(id); return found ? clone(found) : null }

export async function listEventsInRange(from: string, to: string, filter: Parameters<typeof Real.listEventsInRange>[2]) {
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  return store.events
    .filter((e) => {
      const start = new Date(e.startsAt).getTime()
      if (!(start < toMs && new Date(e.endsAt ?? e.startsAt).getTime() >= fromMs)) return false
      if (e.status === 'cancelled') return false
      if (e.createdBy === filter.viewerId) return true
      if (e.status === 'approved') {
        if (e.scope === 'class') return filter.includeOtherClasses || filter.classCodes.includes(e.scopeValue ?? '')
        if (e.scope === 'entity' && e.visibility === 'members') return filter.entityIds.includes(e.entityId ?? '')
        return true
      }
      if (e.status === 'pending' || e.status === 'hidden') return filter.moderatesAll || (e.scope === 'entity' && filter.moderatedEntityIds.includes(e.entityId ?? ''))
      return false
    })
    .sort(byStart).slice(0, 1000).map(clone)
}
export async function listMyEvents(userId: string, limit = 100) {
  return store.events.filter((e) => e.createdBy === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)).slice(0, limit).map(clone)
}
export async function listReviewQueue(scope: { all: boolean; entityIds: string[] }, nowIso: string) {
  return store.events
    .filter((e) => {
      if (!scope.all && !(e.scope === 'entity' && scope.entityIds.includes(e.entityId ?? ''))) return false
      if (e.status === 'pending') return e.startsAt >= nowIso
      if (e.status === 'approved') return e.pendingChanges !== null
      return e.status === 'hidden' && scope.all
    })
    .sort(byStart).slice(0, 200).map(clone)
}
export async function decideEvent(id: string, expectedStatus: EventStatus, patch: Parameters<typeof Real.decideEvent>[2]) {
  const event = findEvent(id)
  if (!event || event.status !== expectedStatus || (expectedStatus === 'approved' && event.pendingChanges === null)) return null
  Object.assign(event, patch.fields ?? {}, {
    status: patch.status, reviewedBy: patch.reviewedBy, reviewedAt: new Date().toISOString(), reviewNote: patch.reviewNote, updatedAt: new Date().toISOString(),
  })
  if (patch.clearPendingChanges) event.pendingChanges = null
  return clone(event)
}
export async function updateEventFields(id: string, fields: Partial<EventFields>, pendingChanges: EventRecord['pendingChanges'] | undefined) {
  const event = findEvent(id)
  if (!event) return null
  Object.assign(event, fields, { updatedAt: new Date().toISOString() })
  if (pendingChanges !== undefined) event.pendingChanges = { ...(event.pendingChanges ?? {}), ...pendingChanges }
  return clone(event)
}
export async function cancelEvent(id: string) {
  const event = findEvent(id)
  if (!event || !['pending', 'approved', 'hidden'].includes(event.status)) return false
  event.status = 'cancelled'
  return true
}
export async function countEventsCreatedSince(userId: string, sinceIso: string) {
  return store.events.filter((e) => e.createdBy === userId && e.createdAt >= sinceIso).length
}
export async function reportEvent(eventId: string, userId: string, reason: string | null) {
  const inserted = !store.eventReports.some((r) => r.eventId === eventId && r.userId === userId)
  if (inserted) store.eventReports.push({ eventId, userId, reason })
  return { inserted, total: store.eventReports.filter((r) => r.eventId === eventId).length }
}
export async function hideEventIfApproved(eventId: string) {
  const event = findEvent(eventId)
  if (!event || event.status !== 'approved') return false
  event.status = 'hidden'
  return true
}
export async function clearEventReports(eventId: string) { store.eventReports = store.eventReports.filter((r) => r.eventId !== eventId) }
export async function listMyReports(userId: string, eventIds: string[]) {
  return store.eventReports.filter((r) => r.userId === userId && eventIds.includes(r.eventId)).map((r) => r.eventId)
}
export async function setRsvp(eventId: string, userId: string, status: 'going' | 'interested' | null) {
  store.eventRsvps = store.eventRsvps.filter((r) => !(r.eventId === eventId && r.userId === userId))
  if (status !== null) store.eventRsvps.push({ eventId, userId, status })
}
export async function getRsvpSummary(eventIds: string[], viewerId: string) {
  const summary = new Map<string, { going: number; interested: number; mine: 'going' | 'interested' | null }>()
  for (const id of eventIds.slice(0, 200)) summary.set(id, { going: 0, interested: 0, mine: null })
  for (const r of store.eventRsvps) {
    const entry = summary.get(r.eventId)
    if (!entry) continue
    entry[r.status] += 1
    if (r.userId === viewerId) entry.mine = r.status
  }
  return summary
}
export async function findEventModeratorIds(ref: Parameters<typeof Real.findEventModeratorIds>[0]) {
  const ids = new Set<string>()
  if (ref.scope === 'entity') for (const m of store.members) if (m.entity_id === ref.scopeValue && m.role === 'admin' && m.left_at === null) ids.add(m.user_id)
  for (const row of store.people.values()) if (superadminEmails.has(row.user.email.toLowerCase())) ids.add(row.user.id)
  return [...ids]
}

// Compile-time check that the fake keeps the same exports/signatures as the real data layer.
export const __contract: typeof Real = {} as typeof Self
