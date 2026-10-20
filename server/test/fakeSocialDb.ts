// In-memory stand-in for server/social/db.ts, used with vi.mock in route tests.
import { randomUUID } from 'node:crypto'
import type * as Real from '../social/db.js'
import type * as Self from './fakeSocialDb.js'
import type { ConnectionRow, Visibility } from '../social/privacy.js'

type Row = { user: Real.UserRow; sub: string; profile: Real.ProfileRow }
type Badge = {
  user_id: string; kind: Real.BadgeKind; source_id: string; label: string; revoked_at: string | null
  icon?: string | null; color?: string | null; entity_id?: string | null
}

export const store = {
  people: new Map<string, Row>(),
  connections: [] as ConnectionRow[],
  entities: new Map<string, { id: string; name: string; hash: string | null }>(),
  members: [] as Real.MembershipRow[],
  badges: [] as Badge[],
  courses: new Map<string, Real.CourseRow[]>(),
  feed: [] as Real.FeedCandidate[],
  schedules: new Set<string>(),
}

export function resetStore() {
  store.people.clear(); store.connections = []; store.entities.clear(); store.members = []; store.badges = []; store.courses.clear(); store.feed = []; store.schedules.clear(); definitions.clear()
}

export function addPerson(opts: { name: string; email?: string; handle: string; showCourses?: Visibility; showConnections?: Visibility; course?: string; courses?: string[] }) {
  const id = randomUUID()
  const email = opts.email ?? `${opts.handle}@usp.br`
  const user = { id, email, name: opts.name, picture: null }
  const profile: Real.ProfileRow = {
    user_id: id, handle: opts.handle, bio: null, course: opts.course ?? 'Sistemas de Informação', entry_year: 2024, links: {},
    show_courses: opts.showCourses ?? 'all', show_connections: opts.showConnections ?? 'all',
  }
  store.people.set(id, { user, sub: `sub-${opts.handle}`, profile })
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

const toRecord = (row: Row): Real.PersonRecord => ({ user: row.user, profile: row.profile })
const sameSide = (c: ConnectionRow, a: string, b: string) => (c.requester_id === a && c.addressee_id === b) || (c.requester_id === b && c.addressee_id === a)

export async function getUserBySub(sub: string) { return [...store.people.values()].find((row) => row.sub === sub)?.user ?? null }
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
export async function listMembers(entityId: string) {
  return store.members.filter((m) => m.entity_id === entityId && m.left_at === null).map((m) => ({ person: toRecord(store.people.get(m.user_id)!), role: m.role, joinedAt: m.joined_at }))
}
export async function listMembershipsOf(userId: string) {
  return store.members.filter((m) => m.user_id === userId && m.left_at === null).map((m) => ({ entityId: m.entity_id, name: store.entities.get(m.entity_id)!.name, role: m.role, joinedAt: m.joined_at }))
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
    collected: 0,
    entryYear: profile?.entry_year ?? null,
    course: profile?.course ?? '',
  }
}
export async function findUserIdsByEntity(entityId: string) { return store.members.filter((m) => m.entity_id === entityId && m.left_at === null).map((m) => m.user_id) }
export async function listFeedCandidates() { return store.feed }

// Compile-time check that the fake keeps the same exports/signatures as the real data layer.
export const __contract: typeof Real = {} as typeof Self
