import { getClient } from '../lib/supabase.js'
import { ensureProfileWithHandle, supabaseHandleStore } from './handles.js'
import type { ConnectionRow, Visibility } from './privacy.js'

// Data layer for the social system. It only reads/writes rows: every access rule
// (privacy, admin checks) lives in the routes and in privacy.ts. Routes never touch
// the Supabase client directly, so tests can replace this whole module.

export type Links = { github?: string; linkedin?: string; instagram?: string }
export type UserRow = { id: string; email: string; name: string; picture: string | null }
export type ProfileRow = {
  user_id: string
  handle: string
  bio: string | null
  course: string
  entry_year: number | null
  links: Links
  show_courses: Visibility
  show_connections: Visibility
}
export type PersonRecord = { user: UserRow; profile: ProfileRow }
export type ProfilePatch = Partial<Pick<ProfileRow, 'bio' | 'course' | 'entry_year' | 'links' | 'show_courses' | 'show_connections'>>
export type CourseRow = { code: string; title: string }
export type BadgeRow = { entityId: string; label: string }
export type EntityRow = { id: string; name: string }
export type Role = 'member' | 'admin'
export type MembershipRow = { entity_id: string; user_id: string; role: Role; joined_at: string; left_at: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ID_LIST_CAP = 1000

function check<T>(label: string, result: { data: T | null; error: { message: string } | null }): T | null {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

type RawPerson = Omit<ProfileRow, 'handle'> & { handle: string | null; users: UserRow | UserRow[] | null }
const PERSON_SELECT = 'user_id, handle, bio, course, entry_year, links, show_courses, show_connections, users!inner(id, email, name, picture)'

function toPerson(raw: RawPerson): PersonRecord | null {
  const user = Array.isArray(raw.users) ? raw.users[0] : raw.users
  if (!user || !raw.handle) return null
  const { users: _users, ...profile } = raw
  return { user, profile: { ...profile, handle: raw.handle, links: raw.links ?? {} } }
}

const toPeople = (rows: RawPerson[] | null) => (rows ?? []).map(toPerson).filter((person): person is PersonRecord => person !== null)
const oneOf = <T>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value)

// ---------- users and profiles ----------

export async function getUserBySub(sub: string): Promise<UserRow | null> {
  return check('Could not load user', await getClient().from('users').select('id, email, name, picture').eq('google_sub', sub).maybeSingle<UserRow>())
}

export async function getPersonById(userId: string): Promise<PersonRecord | null> {
  const raw = check('Could not load profile', await getClient().from('student_profiles').select(PERSON_SELECT).eq('user_id', userId).maybeSingle<RawPerson>())
  return raw ? toPerson(raw) : null
}

export async function getPersonByHandle(handle: string): Promise<PersonRecord | null> {
  const raw = check('Could not load profile', await getClient().from('student_profiles').select(PERSON_SELECT).eq('handle', handle).maybeSingle<RawPerson>())
  return raw ? toPerson(raw) : null
}

export async function getPeopleByIds(ids: string[]): Promise<PersonRecord[]> {
  const safe = ids.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return []
  return toPeople(check('Could not load profiles', await getClient().from('student_profiles').select(PERSON_SELECT).in('user_id', safe).returns<RawPerson[]>()))
}

export async function updateProfile(userId: string, patch: ProfilePatch) {
  const { error } = await getClient().from('student_profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', userId)
  if (error) throw new Error(`Could not update profile: ${error.message}`)
}

export type PeopleSearch = {
  q?: string
  curso?: string
  ano?: number
  userIds?: string[] // restriction computed by the route (entity / course filters)
  excludeUserId: string
  cursor?: string // last handle of the previous page
  limit: number
}

export async function searchPeople(filters: PeopleSearch): Promise<PersonRecord[]> {
  if (filters.userIds && filters.userIds.length === 0) return []
  let query = getClient().from('student_profiles').select(PERSON_SELECT).not('handle', 'is', null).neq('user_id', filters.excludeUserId)
  if (filters.userIds) query = query.in('user_id', filters.userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP))
  if (filters.curso) query = query.eq('course', filters.curso)
  if (filters.ano) query = query.eq('entry_year', filters.ano)
  if (filters.q) query = query.ilike('users.name', `%${filters.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`)
  if (filters.cursor) query = query.gt('handle', filters.cursor)
  return toPeople(check('Could not search people', await query.order('handle', { ascending: true }).limit(filters.limit).returns<RawPerson[]>()))
}

// ---------- courses ----------

export async function getCourses(userId: string): Promise<CourseRow[]> {
  return check('Could not load courses', await getClient().from('user_courses').select('code, title').eq('user_id', userId).order('code').returns<CourseRow[]>()) ?? []
}

export async function getCoursesByUsers(userIds: string[]): Promise<Map<string, CourseRow[]>> {
  const result = new Map<string, CourseRow[]>()
  const safe = userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return result
  const rows = check('Could not load courses', await getClient().from('user_courses').select('user_id, code, title').in('user_id', safe).returns<(CourseRow & { user_id: string })[]>()) ?? []
  for (const row of rows) {
    const list = result.get(row.user_id) ?? []
    list.push({ code: row.code, title: row.title })
    result.set(row.user_id, list)
  }
  return result
}

export async function findUserIdsByCourse(code: string): Promise<string[]> {
  const rows = check('Could not search courses', await getClient().from('user_courses').select('user_id').eq('code', code).limit(ID_LIST_CAP).returns<{ user_id: string }[]>()) ?? []
  return rows.map((row) => row.user_id)
}

// Users (other than `excludeIds`) taking at least one of `codes`.
export async function findUserIdsByCourses(codes: string[], excludeIds: string[]): Promise<string[]> {
  if (codes.length === 0) return []
  const rows = check('Could not search classmates', await getClient().from('user_courses').select('user_id').in('code', codes.slice(0, 100)).limit(2000).returns<{ user_id: string }[]>()) ?? []
  const exclude = new Set(excludeIds)
  return [...new Set(rows.map((row) => row.user_id))].filter((id) => !exclude.has(id))
}

// ---------- connections ----------

const CONNECTION_COLUMNS = 'requester_id, addressee_id, status'

export async function getConnection(a: string, b: string): Promise<ConnectionRow | null> {
  const rows = check('Could not load connection', await getClient().from('connections').select(CONNECTION_COLUMNS)
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`).limit(1).returns<ConnectionRow[]>()) ?? []
  return rows[0] ?? null
}

// Connection rows between `viewerId` and each of `otherIds`.
export async function getConnectionsWith(viewerId: string, otherIds: string[]): Promise<ConnectionRow[]> {
  const safe = otherIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return []
  const client = getClient()
  const [sent, received] = await Promise.all([
    client.from('connections').select(CONNECTION_COLUMNS).eq('requester_id', viewerId).in('addressee_id', safe).returns<ConnectionRow[]>(),
    client.from('connections').select(CONNECTION_COLUMNS).eq('addressee_id', viewerId).in('requester_id', safe).returns<ConnectionRow[]>(),
  ])
  return [...(check('Could not load connections', sent) ?? []), ...(check('Could not load connections', received) ?? [])]
}

export async function createConnection(requesterId: string, addresseeId: string): Promise<'created' | 'exists'> {
  const { error } = await getClient().from('connections').insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
  if (!error) return 'created'
  if (error.code === '23505') return 'exists' // PK or pair index: someone already created it
  throw new Error(`Could not create connection: ${error.message}`)
}

export async function acceptConnection(requesterId: string, addresseeId: string): Promise<boolean> {
  const rows = check('Could not accept connection', await getClient().from('connections')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('requester_id', requesterId).eq('addressee_id', addresseeId).eq('status', 'pending').select('requester_id')) ?? []
  return rows.length > 0
}

export async function deleteConnection(a: string, b: string) {
  const { error } = await getClient().from('connections').delete()
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
  if (error) throw new Error(`Could not delete connection: ${error.message}`)
}

export async function listPendingReceived(userId: string, limit = 100): Promise<{ person: PersonRecord; createdAt: string }[]> {
  const rows = check('Could not load requests', await getClient().from('connections').select('requester_id, created_at')
    .eq('addressee_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(limit).returns<{ requester_id: string; created_at: string }[]>()) ?? []
  const people = new Map((await getPeopleByIds(rows.map((row) => row.requester_id))).map((person) => [person.user.id, person]))
  return rows.flatMap((row) => { const person = people.get(row.requester_id); return person ? [{ person, createdAt: row.created_at }] : [] })
}

export async function countPendingReceived(userId: string): Promise<number> {
  const { count, error } = await getClient().from('connections').select('requester_id', { count: 'exact', head: true }).eq('addressee_id', userId).eq('status', 'pending')
  if (error) throw new Error(`Could not count requests: ${error.message}`)
  return count ?? 0
}

export async function listConnectedIds(userId: string, limit = 500): Promise<string[]> {
  const rows = check('Could not load connections', await getClient().from('connections').select('requester_id, addressee_id')
    .eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).limit(limit).returns<{ requester_id: string; addressee_id: string }[]>()) ?? []
  return rows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id))
}

export async function listConnectionsOf(userId: string, limit = 200): Promise<PersonRecord[]> {
  return getPeopleByIds(await listConnectedIds(userId, limit))
}

// ---------- entities, members, badges ----------

export async function getEntity(id: string): Promise<EntityRow | null> {
  return check('Could not load entity', await getClient().from('entities').select('id, name').eq('id', id).maybeSingle<EntityRow>())
}

export async function findEntityByCodeHash(hash: string): Promise<EntityRow | null> {
  return check('Could not look up code', await getClient().from('entities').select('id, name').eq('invite_code_hash', hash).limit(1).maybeSingle<EntityRow>())
}

export async function setEntityCodeHash(entityId: string, hash: string) {
  const { error } = await getClient().from('entities').update({ invite_code_hash: hash, invite_code_rotated_at: new Date().toISOString() }).eq('id', entityId)
  if (error) throw new Error(`Could not save invite code: ${error.message}`)
}

export async function getMembership(entityId: string, userId: string): Promise<MembershipRow | null> {
  return check('Could not load membership', await getClient().from('entity_members').select('entity_id, user_id, role, joined_at, left_at')
    .eq('entity_id', entityId).eq('user_id', userId).maybeSingle<MembershipRow>())
}

export const isActiveMember = (membership: MembershipRow | null): membership is MembershipRow => !!membership && membership.left_at === null

// Joins (or rejoins) an entity and creates/reactivates the 'entity_member' badge.
export async function joinEntity(entity: EntityRow, userId: string) {
  const client = getClient()
  const now = new Date().toISOString()
  const { error } = await client.from('entity_members').upsert(
    { entity_id: entity.id, user_id: userId, role: 'member', joined_at: now, left_at: null },
    { onConflict: 'entity_id,user_id' },
  )
  if (error) throw new Error(`Could not join entity: ${error.message}`)
  const { error: badgeError } = await client.from('user_badges').upsert(
    { user_id: userId, kind: 'entity_member', source_id: entity.id, label: entity.name, awarded_at: now, revoked_at: null },
    { onConflict: 'user_id,kind,source_id' },
  )
  if (badgeError) throw new Error(`Could not save badge: ${badgeError.message}`)
}

// Leaving (or being removed) closes the membership and revokes the badge; nothing is deleted.
export async function leaveEntity(entityId: string, userId: string) {
  const client = getClient()
  const now = new Date().toISOString()
  const { error } = await client.from('entity_members').update({ left_at: now, role: 'member' }).eq('entity_id', entityId).eq('user_id', userId)
  if (error) throw new Error(`Could not leave entity: ${error.message}`)
  const { error: badgeError } = await client.from('user_badges').update({ revoked_at: now })
    .eq('user_id', userId).eq('kind', 'entity_member').eq('source_id', entityId).is('revoked_at', null)
  if (badgeError) throw new Error(`Could not revoke badge: ${badgeError.message}`)
}

export async function setMemberRole(entityId: string, userId: string, role: Role) {
  const { error } = await getClient().from('entity_members').update({ role }).eq('entity_id', entityId).eq('user_id', userId).is('left_at', null)
  if (error) throw new Error(`Could not change role: ${error.message}`)
}

export async function listMembers(entityId: string, limit = 200): Promise<{ person: PersonRecord; role: Role; joinedAt: string }[]> {
  const rows = check('Could not load members', await getClient().from('entity_members').select('user_id, role, joined_at')
    .eq('entity_id', entityId).is('left_at', null).order('joined_at', { ascending: true }).limit(limit).returns<{ user_id: string; role: Role; joined_at: string }[]>()) ?? []
  const people = new Map((await getPeopleByIds(rows.map((row) => row.user_id))).map((person) => [person.user.id, person]))
  return rows.flatMap((row) => { const person = people.get(row.user_id); return person ? [{ person, role: row.role, joinedAt: row.joined_at }] : [] })
}

type RawNamedEntity = { name: string } | { name: string }[] | null

export async function listMembershipsOf(userId: string): Promise<{ entityId: string; name: string; role: Role; joinedAt: string }[]> {
  const rows = check('Could not load memberships', await getClient().from('entity_members').select('entity_id, role, joined_at, entities(name)')
    .eq('user_id', userId).is('left_at', null).returns<{ entity_id: string; role: Role; joined_at: string; entities: RawNamedEntity }[]>()) ?? []
  return rows.map((row) => ({ entityId: row.entity_id, name: oneOf(row.entities)?.name ?? row.entity_id, role: row.role, joinedAt: row.joined_at }))
}

export async function getBadges(userIds: string[]): Promise<Map<string, BadgeRow[]>> {
  const result = new Map<string, BadgeRow[]>()
  const safe = userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return result
  const rows = check('Could not load badges', await getClient().from('user_badges').select('user_id, source_id, label')
    .eq('kind', 'entity_member').is('revoked_at', null).in('user_id', safe).returns<{ user_id: string; source_id: string; label: string }[]>()) ?? []
  for (const row of rows) {
    const list = result.get(row.user_id) ?? []
    list.push({ entityId: row.source_id, label: row.label })
    result.set(row.user_id, list)
  }
  return result
}

export async function findUserIdsByEntity(entityId: string): Promise<string[]> {
  const rows = check('Could not search entity', await getClient().from('entity_members').select('user_id')
    .eq('entity_id', entityId).is('left_at', null).limit(ID_LIST_CAP).returns<{ user_id: string }[]>()) ?? []
  return rows.map((row) => row.user_id)
}

// ---------- feed candidates (raw events; the route applies privacy) ----------

export type FeedCandidate =
  | { id: string; type: 'entity_join'; at: string; userId: string; entityId: string; entityName: string }
  | { id: string; type: 'connection'; at: string; userId: string; otherUserId: string }
  | { id: string; type: 'classmate_joined'; at: string; userId: string }

export type FeedCursor = { at: string; id: string }

export async function listFeedCandidates(viewerId: string, before: FeedCursor | null, cap: number): Promise<FeedCandidate[]> {
  const client = getClient()
  const until = before?.at ?? new Date(Date.now() + 60_000).toISOString()
  const [connectedIds, viewerCourses] = await Promise.all([listConnectedIds(viewerId), getCourses(viewerId)])
  const classmateIds = (await findUserIdsByCourses(viewerCourses.map((course) => course.code), [viewerId])).slice(0, ID_LIST_CAP)
  const idList = (ids: string[]) => ids.filter((id) => UUID.test(id)).join(',')

  const joinsQuery = client.from('entity_members').select('entity_id, user_id, joined_at, entities(name)')
    .is('left_at', null).neq('user_id', viewerId).lte('joined_at', until).order('joined_at', { ascending: false }).limit(cap)
    .returns<{ entity_id: string; user_id: string; joined_at: string; entities: RawNamedEntity }[]>()
  const connectionsQuery = connectedIds.length === 0 ? null : client.from('connections').select('requester_id, addressee_id, responded_at')
    .eq('status', 'accepted').not('responded_at', 'is', null).lte('responded_at', until)
    .or(`requester_id.in.(${idList(connectedIds)}),addressee_id.in.(${idList(connectedIds)})`)
    .order('responded_at', { ascending: false }).limit(cap).returns<{ requester_id: string; addressee_id: string; responded_at: string }[]>()
  const classmatesQuery = classmateIds.length === 0 ? null : client.from('users').select('id, created_at').in('id', classmateIds)
    .lte('created_at', until).order('created_at', { ascending: false }).limit(cap).returns<{ id: string; created_at: string }[]>()

  const [joins, connections, classmates] = await Promise.all([joinsQuery, connectionsQuery, classmatesQuery])
  const events: FeedCandidate[] = []
  for (const row of check('Could not load feed', joins) ?? []) {
    events.push({ id: `j:${row.entity_id}:${row.user_id}`, type: 'entity_join', at: row.joined_at, userId: row.user_id, entityId: row.entity_id, entityName: oneOf(row.entities)?.name ?? row.entity_id })
  }
  for (const row of (connections ? check('Could not load feed', connections) : null) ?? []) {
    events.push({ id: `c:${row.requester_id}:${row.addressee_id}`, type: 'connection', at: row.responded_at, userId: row.requester_id, otherUserId: row.addressee_id })
  }
  for (const row of (classmates ? check('Could not load feed', classmates) : null) ?? []) {
    events.push({ id: `u:${row.id}`, type: 'classmate_joined', at: row.created_at, userId: row.id })
  }
  return events
}

// ---------- login helpers ----------

export async function ensureViewerProfile(userId: string, email: string): Promise<PersonRecord | null> {
  await ensureProfileWithHandle(supabaseHandleStore(getClient()), userId, email)
  return getPersonById(userId)
}
