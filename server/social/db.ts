import { getClient } from '../lib/supabase.js'
import { mergeCard, type CardSettings } from './cardOptions.js'
import type { UnlockStats } from './cardUnlocks.js'
import type { BadgeColor, BadgeIcon } from './badgeCatalog.js'
import { ensureProfileWithHandle, supabaseHandleStore } from './handles.js'
import type { ConnectionRow, Visibility } from './privacy.js'
import { superadminEmails } from '../lib/config.js'
import type { EventActor, EventFields, EventRecord, EventStatus, ScopeRef } from '../events/types.js'

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
  technologies: string[]
  show_courses: Visibility
  show_connections: Visibility
  avatar_path: string | null
}
export type PersonRecord = { user: UserRow; profile: ProfileRow }
export type ProfilePatch = Partial<Pick<ProfileRow, 'bio' | 'course' | 'entry_year' | 'links' | 'technologies' | 'show_courses' | 'show_connections'>>
export type CourseRow = { code: string; title: string }
export type BadgeKind = 'entity_member' | 'achievement' | 'admin_award' | 'entity_award' | 'cohort'
export type BadgeRow = { kind: BadgeKind; sourceId: string; label: string; icon: string | null; color: string | null; entityId: string | null }
export type BadgeInput = { kind: BadgeKind; sourceId: string; label: string; icon?: string | null; color?: string | null; entityId?: string | null }
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
const PERSON_SELECT = 'user_id, handle, bio, course, entry_year, links, technologies, show_courses, show_connections, avatar_path, users!inner(id, email, name, picture)'

export const avatarPublicUrl = (path: string): string => getClient().storage.from('avatars').getPublicUrl(path).data.publicUrl

// A custom avatar wins over the Google picture, so every presenter inherits the rule.
function toPerson(raw: RawPerson): PersonRecord | null {
  const googleUser = Array.isArray(raw.users) ? raw.users[0] : raw.users
  if (!googleUser || !raw.handle) return null
  const user = raw.avatar_path ? { ...googleUser, picture: avatarPublicUrl(raw.avatar_path) } : googleUser
  const { users: _users, ...profile } = raw
  return { user, profile: { ...profile, handle: raw.handle, links: raw.links ?? {}, technologies: raw.technologies ?? [] } }
}

const toPeople = (rows: RawPerson[] | null) => (rows ?? []).map(toPerson).filter((person): person is PersonRecord => person !== null)
const oneOf = <T>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value)

// ---------- users and profiles ----------

export async function getUserBySub(sub: string): Promise<UserRow | null> {
  return check('Could not load user', await getClient().from('users').select('id, email, name, picture').eq('google_sub', sub).maybeSingle<UserRow>())
}

export async function setAvatarPath(userId: string, path: string | null): Promise<void> {
  const { error } = await getClient().from('student_profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('user_id', userId)
  if (error) throw new Error(`Could not update avatar: ${error.message}`)
}

export async function createAvatarUploadUrl(path: string): Promise<{ signedUrl: string; token: string }> {
  const { data, error } = await getClient().storage.from('avatars').createSignedUploadUrl(path)
  if (error || !data) throw new Error(`Could not create upload url: ${error?.message}`)
  return { signedUrl: data.signedUrl, token: data.token }
}

export async function avatarObjectExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf('/')
  const name = path.slice(slash + 1)
  const { data, error } = await getClient().storage.from('avatars').list(path.slice(0, slash), { search: name })
  if (error) throw new Error(`Could not check avatar: ${error.message}`)
  return (data ?? []).some((file) => file.name === name)
}

// Deletes every file under `{userId}/` except `keep` (all of them when keep is null).
export async function removeAvatarObjects(userId: string, keep: string | null): Promise<void> {
  const bucket = getClient().storage.from('avatars')
  const { data, error } = await bucket.list(userId)
  if (error) throw new Error(`Could not list avatars: ${error.message}`)
  const stale = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep)
  if (stale.length === 0) return
  const removed = await bucket.remove(stale)
  if (removed.error) throw new Error(`Could not remove avatars: ${removed.error.message}`)
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
    { user_id: userId, kind: 'entity_member', source_id: entity.id, label: entity.name, entity_id: entity.id, awarded_at: now, revoked_at: null },
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

// The title (cargo) is free text set by an entity admin; null when none.
export async function setMemberTitle(entityId: string, userId: string, title: string | null) {
  const { error } = await getClient().from('entity_members').update({ title }).eq('entity_id', entityId).eq('user_id', userId).is('left_at', null)
  if (error) throw new Error(`Could not set title: ${error.message}`)
}

export async function listMembers(entityId: string, limit = 200): Promise<{ person: PersonRecord; role: Role; joinedAt: string; title: string | null }[]> {
  const rows = check('Could not load members', await getClient().from('entity_members').select('user_id, role, joined_at, title')
    .eq('entity_id', entityId).is('left_at', null).order('joined_at', { ascending: true }).limit(limit).returns<{ user_id: string; role: Role; joined_at: string; title: string | null }[]>()) ?? []
  const people = new Map((await getPeopleByIds(rows.map((row) => row.user_id))).map((person) => [person.user.id, person]))
  return rows.flatMap((row) => { const person = people.get(row.user_id); return person ? [{ person, role: row.role, joinedAt: row.joined_at, title: row.title }] : [] })
}

type RawNamedEntity = { name: string } | { name: string }[] | null

export async function listMembershipsOf(userId: string): Promise<{ entityId: string; name: string; role: Role; joinedAt: string; title: string | null }[]> {
  const rows = check('Could not load memberships', await getClient().from('entity_members').select('entity_id, role, joined_at, title, entities(name)')
    .eq('user_id', userId).is('left_at', null).returns<{ entity_id: string; role: Role; joined_at: string; title: string | null; entities: RawNamedEntity }[]>()) ?? []
  return rows.map((row) => ({ entityId: row.entity_id, name: oneOf(row.entities)?.name ?? row.entity_id, role: row.role, joinedAt: row.joined_at, title: row.title }))
}

export async function listMembershipsOfMany(userIds: string[]): Promise<Map<string, { entityId: string; name: string; title: string | null }[]>> {
  const result = new Map<string, { entityId: string; name: string; title: string | null }[]>()
  const safe = userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return result
  const rows = check('Could not load memberships', await getClient().from('entity_members').select('user_id, entity_id, title, entities(name)')
    .in('user_id', safe).is('left_at', null).order('joined_at', { ascending: true }).returns<{ user_id: string; entity_id: string; title: string | null; entities: RawNamedEntity }[]>()) ?? []
  for (const row of rows) {
    const list = result.get(row.user_id) ?? []
    list.push({ entityId: row.entity_id, name: oneOf(row.entities)?.name ?? row.entity_id, title: row.title })
    result.set(row.user_id, list)
  }
  return result
}

type RawBadge = { user_id: string; kind: BadgeKind; source_id: string; label: string; icon: string | null; color: string | null; entity_id: string | null }

export async function getBadges(userIds: string[]): Promise<Map<string, BadgeRow[]>> {
  const result = new Map<string, BadgeRow[]>()
  const safe = userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length === 0) return result
  const rows = check('Could not load badges', await getClient().from('user_badges').select('user_id, kind, source_id, label, icon, color, entity_id')
    .is('revoked_at', null).in('user_id', safe).order('awarded_at', { ascending: true }).returns<RawBadge[]>()) ?? []
  for (const row of rows) {
    const list = result.get(row.user_id) ?? []
    list.push({ kind: row.kind, sourceId: row.source_id, label: row.label, icon: row.icon, color: row.color, entityId: row.kind === 'entity_member' ? row.source_id : row.entity_id })
    result.set(row.user_id, list)
  }
  return result
}

// Grants a badge (or reactivates a revoked one). 'exists' means it was already active.
export async function awardBadge(userId: string, badge: BadgeInput): Promise<'awarded' | 'exists'> {
  const client = getClient()
  const current = check('Could not load badge', await client.from('user_badges').select('revoked_at')
    .eq('user_id', userId).eq('kind', badge.kind).eq('source_id', badge.sourceId).maybeSingle<{ revoked_at: string | null }>())
  if (current && current.revoked_at === null) return 'exists'
  const { error } = await client.from('user_badges').upsert(
    { user_id: userId, kind: badge.kind, source_id: badge.sourceId, label: badge.label, icon: badge.icon ?? null, color: badge.color ?? null, entity_id: badge.entityId ?? null, awarded_at: new Date().toISOString(), revoked_at: null },
    { onConflict: 'user_id,kind,source_id' },
  )
  if (error) throw new Error(`Could not award badge: ${error.message}`)
  return 'awarded'
}

export async function revokeBadge(userId: string, kind: BadgeKind, sourceId: string): Promise<boolean> {
  const rows = check('Could not revoke badge', await getClient().from('user_badges').update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId).eq('kind', kind).eq('source_id', sourceId).is('revoked_at', null).select('id').returns<{ id: string }[]>()) ?? []
  return rows.length > 0
}

export type BadgeDefinition = {
  id: string; kind: 'admin_award' | 'entity_award'; entityId: string | null; label: string; description: string | null; icon: BadgeIcon; color: BadgeColor
}
type RawDefinition = { id: string; kind: BadgeDefinition['kind']; entity_id: string | null; label: string; description: string | null; icon: BadgeIcon; color: BadgeColor }
const DEFINITION_SELECT = 'id, kind, entity_id, label, description, icon, color'
const toDefinition = (row: RawDefinition): BadgeDefinition => ({ id: row.id, kind: row.kind, entityId: row.entity_id, label: row.label, description: row.description, icon: row.icon, color: row.color })

export async function listBadgeDefinitions(filter: { kind: 'admin_award' } | { entityId: string }): Promise<BadgeDefinition[]> {
  let query = getClient().from('badge_definitions').select(DEFINITION_SELECT).is('archived_at', null)
  query = 'entityId' in filter ? query.eq('kind', 'entity_award').eq('entity_id', filter.entityId) : query.eq('kind', 'admin_award')
  return (check('Could not load badge definitions', await query.order('created_at', { ascending: true }).returns<RawDefinition[]>()) ?? []).map(toDefinition)
}

export async function getBadgeDefinition(id: string): Promise<BadgeDefinition | null> {
  if (!UUID.test(id)) return null
  const row = check('Could not load badge definition', await getClient().from('badge_definitions').select(DEFINITION_SELECT).eq('id', id).is('archived_at', null).maybeSingle<RawDefinition>())
  return row ? toDefinition(row) : null
}

export async function createBadgeDefinition(input: Omit<BadgeDefinition, 'id'> & { createdBy: string }): Promise<BadgeDefinition> {
  const row = check('Could not create badge definition', await getClient().from('badge_definitions').insert({
    kind: input.kind, entity_id: input.entityId, label: input.label, description: input.description, icon: input.icon, color: input.color, created_by: input.createdBy,
  }).select(DEFINITION_SELECT).single<RawDefinition>())
  if (!row) throw new Error('Could not create badge definition')
  return toDefinition(row)
}

export async function archiveBadgeDefinition(id: string): Promise<void> {
  const { error } = await getClient().from('badge_definitions').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`Could not archive badge definition: ${error.message}`)
}

export type AchievementStats = {
  profileComplete: boolean; connections: number; scheduleImported: boolean; collected: number; entryYear: number | null; course: string
}

export async function getAchievementStats(userId: string): Promise<AchievementStats> {
  const client = getClient()
  const [person, connections, schedule, collected] = await Promise.all([
    getPersonById(userId),
    client.from('connections').select('requester_id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    client.from('schedule_imports').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
    countCollected(userId),
  ])
  if (connections.error) throw new Error(`Could not count connections: ${connections.error.message}`)
  if (schedule.error) throw new Error(`Could not check schedule: ${schedule.error.message}`)
  const profile = person?.profile
  const hasLink = Object.values(profile?.links ?? {}).some((value) => typeof value === 'string' && value.trim() !== '')
  return {
    profileComplete: !!profile?.bio?.trim() && profile.entry_year !== null && hasLink,
    connections: connections.count ?? 0,
    scheduleImported: (schedule.count ?? 0) > 0,
    collected,
    entryYear: profile?.entry_year ?? null,
    course: profile?.course ?? '',
  }
}

export async function findUserIdsByEntity(entityId: string): Promise<string[]> {
  const rows = check('Could not search entity', await getClient().from('entity_members').select('user_id')
    .eq('entity_id', entityId).is('left_at', null).limit(ID_LIST_CAP).returns<{ user_id: string }[]>()) ?? []
  return rows.map((row) => row.user_id)
}

// ---------- card ----------

export type CardState = { settings: CardSettings; isPublic: boolean }

export async function getCardSettings(userId: string): Promise<CardState> {
  const row = check('Could not load card', await getClient().from('student_profiles').select('card, card_public').eq('user_id', userId).maybeSingle<{ card: unknown; card_public: boolean | null }>())
  return { settings: mergeCard(row?.card), isPublic: row?.card_public === true }
}

export async function getCardSettingsMany(userIds: string[]): Promise<Map<string, CardState>> {
  const result = new Map<string, CardState>()
  const safe = userIds.filter((id) => UUID.test(id)).slice(0, ID_LIST_CAP)
  if (safe.length > 0) {
    const rows = check('Could not load cards', await getClient().from('student_profiles').select('user_id, card, card_public')
      .in('user_id', safe).returns<{ user_id: string; card: unknown; card_public: boolean | null }[]>()) ?? []
    for (const row of rows) result.set(row.user_id, { settings: mergeCard(row.card), isPublic: row.card_public === true })
  }
  for (const id of userIds) if (!result.has(id)) result.set(id, { settings: mergeCard(undefined), isPublic: false })
  return result
}

export async function updateCard(userId: string, patch: { settings?: CardSettings; public?: boolean }): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.settings) update.card = patch.settings
  if (patch.public !== undefined) update.card_public = patch.public
  const { error } = await getClient().from('student_profiles').update(update).eq('user_id', userId)
  if (error) throw new Error(`Could not update card: ${error.message}`)
}

export async function countCollected(userId: string): Promise<number> {
  const { count, error } = await getClient().from('card_collection').select('collected_id', { count: 'exact', head: true }).eq('collector_id', userId)
  if (error) throw new Error(`Could not count collection: ${error.message}`)
  return count ?? 0
}

export async function isCollected(collectorId: string, collectedId: string): Promise<boolean> {
  return check('Could not check collection', await getClient().from('card_collection').select('collected_id').eq('collector_id', collectorId).eq('collected_id', collectedId).maybeSingle<{ collected_id: string }>()) !== null
}

/** Idempotent: a second collect of the same card reports 'exists' and writes nothing. */
export async function collectCard(collectorId: string, collectedId: string): Promise<'collected' | 'exists'> {
  const { data, error } = await getClient().from('card_collection').upsert({ collector_id: collectorId, collected_id: collectedId }, { onConflict: 'collector_id,collected_id', ignoreDuplicates: true }).select('collected_id').returns<{ collected_id: string }[]>()
  if (error) throw new Error(`Could not collect card: ${error.message}`)
  return (data ?? []).length > 0 ? 'collected' : 'exists'
}

export async function uncollectCard(collectorId: string, collectedId: string): Promise<void> {
  const { error } = await getClient().from('card_collection').delete().eq('collector_id', collectorId).eq('collected_id', collectedId)
  if (error) throw new Error(`Could not remove card from collection: ${error.message}`)
}

export async function listCollection(collectorId: string, before: { at: string; id: string } | null, limit: number): Promise<{ person: PersonRecord; collectedAt: string }[]> {
  let query = getClient().from('card_collection').select('collected_id, collected_at').eq('collector_id', collectorId)
  if (before) query = query.or(`collected_at.lt."${before.at}",and(collected_at.eq."${before.at}",collected_id.lt.${before.id})`)
  const rows = check('Could not load collection', await query.order('collected_at', { ascending: false }).order('collected_id', { ascending: false }).limit(limit).returns<{ collected_id: string; collected_at: string }[]>()) ?? []
  const people = new Map((await getPeopleByIds(rows.map((row) => row.collected_id))).map((person) => [person.user.id, person]))
  return rows.flatMap((row) => { const person = people.get(row.collected_id); return person ? [{ person, collectedAt: row.collected_at }] : [] })
}

export async function getUnlockStats(userId: string): Promise<UnlockStats> {
  const [stats, memberships, badges, collected] = await Promise.all([getAchievementStats(userId), listMembershipsOf(userId), getBadges([userId]), countCollected(userId)])
  const own = badges.get(userId) ?? []
  return {
    badgeCount: own.filter((badge) => badge.kind !== 'entity_member').length,
    hasTitle: memberships.some((membership) => !!membership.title),
    connections: stats.connections,
    hasAdminAward: own.some((badge) => badge.kind === 'admin_award'),
    collected,
    entityIds: memberships.map((membership) => membership.entityId),
  }
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


// ---------- notifications ----------

export type NotificationType = 'connection_request' | 'connection_accepted' | 'entity_joined' | 'entity_role_changed' | 'entity_removed' | 'badge_awarded' | 'announcement'
  | 'event_submitted' | 'event_approved' | 'event_rejected' | 'event_hidden' | 'event_reminder'
export type NotificationInput = { type: NotificationType; actorId?: string | null; entityId?: string | null; payload?: Record<string, unknown> }
export type NotificationRow = {
  id: string; userId: string; type: NotificationType; actorId: string | null; entityId: string | null
  payload: Record<string, unknown>; createdAt: string; readAt: string | null
}
type RawNotification = {
  id: string; user_id: string; type: NotificationType; actor_id: string | null; entity_id: string | null
  payload: Record<string, unknown>; created_at: string; read_at: string | null
}
const NOTIFICATION_COLUMNS = 'id, user_id, type, actor_id, entity_id, payload, created_at, read_at'
const NOTIFICATION_BATCH = 500
const toNotification = (raw: RawNotification): NotificationRow => ({
  id: raw.id, userId: raw.user_id, type: raw.type, actorId: raw.actor_id, entityId: raw.entity_id, payload: raw.payload ?? {}, createdAt: raw.created_at, readAt: raw.read_at,
})

export async function insertNotifications(userIds: string[], input: NotificationInput): Promise<NotificationRow[]> {
  const unique = [...new Set(userIds.filter((id) => UUID.test(id)))]
  const result: NotificationRow[] = []
  for (let i = 0; i < unique.length; i += NOTIFICATION_BATCH) {
    const rows = unique.slice(i, i + NOTIFICATION_BATCH).map((userId) => ({
      user_id: userId, type: input.type, actor_id: input.actorId ?? null, entity_id: input.entityId ?? null, payload: input.payload ?? {},
    }))
    const saved = check('Could not save notifications', await getClient().from('notifications').insert(rows).select(NOTIFICATION_COLUMNS).returns<RawNotification[]>()) ?? []
    result.push(...saved.map(toNotification))
  }
  return result
}

export async function listNotifications(userId: string, before: { at: string; id: string } | null, limit: number): Promise<NotificationRow[]> {
  let query = getClient().from('notifications').select(NOTIFICATION_COLUMNS).eq('user_id', userId)
  if (before) query = query.or(`created_at.lt."${before.at}",and(created_at.eq."${before.at}",id.lt.${before.id})`)
  const rows = check('Could not load notifications', await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit).returns<RawNotification[]>()) ?? []
  return rows.map(toNotification)
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await getClient().from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null)
  if (error) throw new Error(`Could not count notifications: ${error.message}`)
  return count ?? 0
}

export async function markRead(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false
  const client = getClient()
  const updated = check('Could not mark notification', await client.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId).is('read_at', null).select('id').returns<{ id: string }[]>()) ?? []
  if (updated.length > 0) return true
  // Already read still counts as found; only a missing or foreign id is a 404.
  return check('Could not mark notification', await client.from('notifications').select('id').eq('id', id).eq('user_id', userId).maybeSingle<{ id: string }>()) !== null
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await getClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  if (error) throw new Error(`Could not mark notifications: ${error.message}`)
}

export async function getEntitiesByIds(ids: string[]): Promise<EntityRow[]> {
  const safe = [...new Set(ids)].slice(0, ID_LIST_CAP)
  if (safe.length === 0) return []
  return check('Could not load entities', await getClient().from('entities').select('id, name').in('id', safe).returns<EntityRow[]>()) ?? []
}

// ---------- push subscriptions ----------

export type PushKeys = { p256dh: string; auth: string }
export type PushSubscriptionInput = { endpoint: string; keys: PushKeys }
export type PushSubscriptionRow = { id: string; userId: string; endpoint: string; keys: PushKeys }

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  const { error } = await getClient().from('push_subscriptions').upsert(
    { user_id: userId, kind: 'web', endpoint: sub.endpoint, keys: sub.keys, last_seen_at: new Date().toISOString() },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(`Could not save push subscription: ${error.message}`)
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await getClient().from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint)
  if (error) throw new Error(`Could not delete push subscription: ${error.message}`)
}

const IN_FILTER_BATCH = 150

export async function listPushSubscriptions(userIds: string[]): Promise<PushSubscriptionRow[]> {
  const unique = [...new Set(userIds.filter((id) => UUID.test(id)))]
  const result: PushSubscriptionRow[] = []
  // ids go in the URL of a GET; small chunks keep it far from proxy URL-length limits.
  for (let i = 0; i < unique.length; i += IN_FILTER_BATCH) {
    const rows = check('Could not load push subscriptions', await getClient().from('push_subscriptions').select('id, user_id, endpoint, keys')
      .eq('kind', 'web').in('user_id', unique.slice(i, i + IN_FILTER_BATCH)).returns<{ id: string; user_id: string; endpoint: string; keys: PushKeys }[]>()) ?? []
    result.push(...rows.map((row) => ({ id: row.id, userId: row.user_id, endpoint: row.endpoint, keys: row.keys })))
  }
  return result
}

export async function deletePushSubscriptionById(id: string): Promise<void> {
  const { error } = await getClient().from('push_subscriptions').delete().eq('id', id)
  if (error) throw new Error(`Could not delete push subscription: ${error.message}`)
}

// ---------- announcements ----------

export type Audience = 'all' | 'course' | 'cohort' | 'entity'
const AUDIENCE_CAP = 5000
const AUDIENCE_PAGE = 1000

// Pages through the table (Supabase caps a single response) up to AUDIENCE_CAP ids.
export async function resolveAudience(audience: Audience, value: string | null): Promise<string[]> {
  const ids: string[] = []
  for (let from = 0; from < AUDIENCE_CAP; from += AUDIENCE_PAGE) {
    let query = audience === 'entity'
      ? getClient().from('entity_members').select('user_id').eq('entity_id', value ?? '').is('left_at', null)
      : getClient().from('student_profiles').select('user_id')
    if (audience === 'course') query = query.eq('course', value ?? '')
    if (audience === 'cohort') query = query.eq('entry_year', Number(value))
    const rows = check('Could not resolve audience', await query.order('user_id').range(from, from + AUDIENCE_PAGE - 1).returns<{ user_id: string }[]>()) ?? []
    ids.push(...rows.map((row) => row.user_id))
    if (rows.length < AUDIENCE_PAGE) break
  }
  return ids
}

export async function createAnnouncement(input: {
  authorId: string; entityId: string | null; audience: Audience; audienceValue: string | null
  title: string; body: string; link: string | null; recipients: number
}): Promise<{ id: string }> {
  const saved = check('Could not save announcement', await getClient().from('announcements').insert({
    author_id: input.authorId, entity_id: input.entityId, audience: input.audience, audience_value: input.audienceValue,
    title: input.title, body: input.body, link: input.link, recipients: input.recipients,
  }).select('id').single<{ id: string }>())
  return { id: saved!.id }
}

export async function countEntityAnnouncementsSince(entityId: string, sinceIso: string): Promise<number> {
  const { count, error } = await getClient().from('announcements').select('id', { count: 'exact', head: true }).eq('entity_id', entityId).gte('created_at', sinceIso)
  if (error) throw new Error(`Could not count announcements: ${error.message}`)
  return count ?? 0
}

// ---------- calendar events ----------

type RawEvent = {
  id: string; title: string; description: string | null; kind: EventRecord['kind']; scope: EventRecord['scope']; scope_value: string | null
  visibility: EventRecord['visibility']; starts_at: string; ends_at: string | null; all_day: boolean; location: string | null; link: string | null
  status: EventStatus; pending_changes: EventRecord['pendingChanges']; source: EventRecord['source']; created_by: string | null
  reviewed_by: string | null; reviewed_at: string | null; review_note: string | null; created_at: string; updated_at: string
}
const EVENT_COLUMNS = 'id, title, description, kind, scope, scope_value, visibility, starts_at, ends_at, all_day, location, link, status, pending_changes, source, created_by, reviewed_by, reviewed_at, review_note, created_at, updated_at'
const EVENT_RANGE_CAP = 1000
const REVIEW_QUEUE_CAP = 200
const toEvent = (raw: RawEvent): EventRecord => ({
  id: raw.id, title: raw.title, description: raw.description, kind: raw.kind, scope: raw.scope, scopeValue: raw.scope_value,
  visibility: raw.visibility, startsAt: raw.starts_at, endsAt: raw.ends_at, allDay: raw.all_day, location: raw.location, link: raw.link,
  status: raw.status, pendingChanges: raw.pending_changes ?? null, source: raw.source, createdBy: raw.created_by,
  reviewedBy: raw.reviewed_by, reviewedAt: raw.reviewed_at, reviewNote: raw.review_note, createdAt: raw.created_at, updatedAt: raw.updated_at,
})
const toEvents = (rows: RawEvent[] | null) => (rows ?? []).map(toEvent)

function eventFieldsToRow(fields: Partial<EventFields>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (fields.title !== undefined) row.title = fields.title
  if (fields.description !== undefined) row.description = fields.description
  if (fields.kind !== undefined) row.kind = fields.kind
  if (fields.startsAt !== undefined) row.starts_at = fields.startsAt
  if (fields.endsAt !== undefined) row.ends_at = fields.endsAt
  if (fields.allDay !== undefined) row.all_day = fields.allDay
  if (fields.location !== undefined) row.location = fields.location
  if (fields.link !== undefined) row.link = fields.link
  if (fields.visibility !== undefined) row.visibility = fields.visibility
  return row
}

export async function getEventActor(userId: string, isSuperadmin: boolean): Promise<EventActor> {
  const client = getClient()
  const [profile, courses, memberships] = await Promise.all([
    client.from('student_profiles').select('campus, course, entry_year').eq('user_id', userId).maybeSingle<{ campus: string | null; course: string | null; entry_year: number | null }>(),
    client.from('user_courses').select('code').eq('user_id', userId).returns<{ code: string }[]>(),
    client.from('entity_members').select('entity_id, role').eq('user_id', userId).is('left_at', null).returns<{ entity_id: string; role: Role }[]>(),
  ])
  const row = check('Could not load event actor', profile)
  return {
    userId, isSuperadmin,
    campus: row?.campus ?? null, course: row?.course ?? null, entryYear: row?.entry_year ?? null,
    classCodes: new Set((check('Could not load event actor', courses) ?? []).map((c) => c.code)),
    memberships: new Map((check('Could not load event actor', memberships) ?? []).map((m) => [m.entity_id, m.role] as const)),
  }
}

// ---------- calendar feed (.ics) ----------

export async function setCalendarFeedTokenHash(userId: string, hash: string | null): Promise<void> {
  const { error } = await getClient().from('student_profiles').update({ calendar_feed_token_hash: hash, updated_at: new Date().toISOString() }).eq('user_id', userId)
  if (error) throw new Error(`Could not update calendar feed token: ${error.message}`)
}

export async function findUserIdByFeedTokenHash(hash: string): Promise<string | null> {
  const row = check('Could not look up calendar feed', await getClient().from('student_profiles').select('user_id').eq('calendar_feed_token_hash', hash).maybeSingle<{ user_id: string }>())
  return row?.user_id ?? null
}

export async function hasCalendarFeedToken(userId: string): Promise<boolean> {
  const row = check('Could not load calendar feed status', await getClient().from('student_profiles').select('calendar_feed_token_hash').eq('user_id', userId).maybeSingle<{ calendar_feed_token_hash: string | null }>())
  return !!row?.calendar_feed_token_hash
}

export type FeedClassEntry = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; room: string; building: string }

// Aulas importadas do Júpiter (schedule_imports.entries); a leitura por google_sub fica em server/db.ts.
export async function getScheduleEntries(userId: string): Promise<FeedClassEntry[]> {
  const row = check('Could not load schedule', await getClient().from('schedule_imports').select('entries').eq('user_id', userId).maybeSingle<{ entries: FeedClassEntry[] | null }>())
  return Array.isArray(row?.entries) ? row.entries : []
}

export async function createEvent(input: ScopeRef & EventFields & {
  status: 'pending' | 'approved'; createdBy: string | null; source?: 'user' | 'usp_import'; externalId?: string | null; reviewedBy?: string | null
}): Promise<EventRecord> {
  const saved = check('Could not create event', await getClient().from('events').insert({
    ...eventFieldsToRow(input),
    scope: input.scope, scope_value: input.scopeValue, entity_id: input.scope === 'entity' ? input.scopeValue : null,
    status: input.status, created_by: input.createdBy, source: input.source ?? 'user', external_id: input.externalId ?? null,
    reviewed_by: input.reviewedBy ?? null, reviewed_at: input.reviewedBy ? new Date().toISOString() : null,
  }).select(EVENT_COLUMNS).single<RawEvent>())
  return toEvent(saved!)
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  if (!UUID.test(id)) return null
  const raw = check('Could not load event', await getClient().from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle<RawEvent>())
  return raw ? toEvent(raw) : null
}

export async function listEventsInRange(from: string, to: string, filter: {
  classCodes: string[]; entityIds: string[]; includeOtherClasses: boolean; viewerId: string; moderatesAll: boolean; moderatedEntityIds: string[]
}): Promise<EventRecord[]> {
  // Cheap pre-filter: may return more than the viewer can see (the route applies canView), never less.
  const fromIso = new Date(from).toISOString()
  const toIso = new Date(to).toISOString()
  const range = () => getClient().from('events').select(EVENT_COLUMNS).lt('starts_at', toIso)
    .or(`ends_at.gte."${fromIso}",and(ends_at.is.null,starts_at.gte."${fromIso}")`)
  const approved = () => range().eq('status', 'approved')
  const run = async (query: PromiseLike<{ data: RawEvent[] | null; error: { message: string } | null }>) => toEvents(check('Could not load events', await query))
  const cap = <T extends { order: (c: string) => { limit: (n: number) => PromiseLike<{ data: RawEvent[] | null; error: { message: string } | null }> } }>(q: T) => q.order('starts_at').limit(EVENT_RANGE_CAP)
  const classCodes = filter.classCodes.slice(0, 100)
  const entityIds = filter.entityIds.slice(0, 100)
  const moderated = filter.moderatedEntityIds.slice(0, 100)

  const queries: PromiseLike<EventRecord[]>[] = [
    run(cap(approved().not('scope', 'in', '(class,entity)'))),
    run(cap(filter.includeOtherClasses ? approved().eq('scope', 'class') : approved().eq('scope', 'class').in('scope_value', classCodes.length > 0 ? classCodes : ['']))),
    run(cap(approved().eq('scope', 'entity').eq('visibility', 'public'))),
    run(cap(range().eq('created_by', filter.viewerId).neq('status', 'cancelled'))),
  ]
  if (entityIds.length > 0) queries.push(run(cap(approved().eq('scope', 'entity').eq('visibility', 'members').in('entity_id', entityIds))))
  if (filter.moderatesAll) queries.push(run(cap(range().in('status', ['pending', 'hidden']))))
  else if (moderated.length > 0) queries.push(run(cap(range().in('status', ['pending', 'hidden']).eq('scope', 'entity').in('entity_id', moderated))))

  const byId = new Map<string, EventRecord>()
  for (const list of await Promise.all(queries)) for (const event of list) byId.set(event.id, event)
  return [...byId.values()].sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : a.id < b.id ? -1 : 1)).slice(0, EVENT_RANGE_CAP)
}

export async function listMyEvents(userId: string, limit = 100): Promise<EventRecord[]> {
  return toEvents(check('Could not load events', await getClient().from('events').select(EVENT_COLUMNS).eq('created_by', userId)
    .order('created_at', { ascending: false }).limit(limit).returns<RawEvent[]>()))
}

export async function listReviewQueue(scope: { all: boolean; entityIds: string[] }, nowIso: string): Promise<EventRecord[]> {
  const entityIds = scope.entityIds.slice(0, 100)
  if (!scope.all && entityIds.length === 0) return []
  const base = (status: EventStatus) => {
    const query = getClient().from('events').select(EVENT_COLUMNS).eq('status', status)
    return scope.all ? query : query.eq('scope', 'entity').in('entity_id', entityIds)
  }
  const queries = [
    base('pending').gte('starts_at', nowIso).order('starts_at').limit(REVIEW_QUEUE_CAP).returns<RawEvent[]>(),
    base('approved').not('pending_changes', 'is', null).order('starts_at').limit(REVIEW_QUEUE_CAP).returns<RawEvent[]>(),
  ]
  // Reports only exist for class-scoped (matéria) events, so hidden ones are for superadmins only.
  if (scope.all) queries.push(base('hidden').order('starts_at').limit(REVIEW_QUEUE_CAP).returns<RawEvent[]>())
  const byId = new Map<string, EventRecord>()
  for (const result of await Promise.all(queries)) for (const event of toEvents(check('Could not load review queue', result))) byId.set(event.id, event)
  return [...byId.values()].sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : a.id < b.id ? -1 : 1)).slice(0, REVIEW_QUEUE_CAP)
}

// Conditional update: returns null when another decision changed the status first.
export async function decideEvent(id: string, expectedStatus: EventStatus, patch: {
  status: EventStatus; fields?: Partial<EventFields>; clearPendingChanges?: boolean; reviewedBy: string; reviewNote: string | null
}): Promise<EventRecord | null> {
  if (!UUID.test(id)) return null
  const row: Record<string, unknown> = {
    ...eventFieldsToRow(patch.fields ?? {}), status: patch.status, reviewed_by: patch.reviewedBy, reviewed_at: new Date().toISOString(), review_note: patch.reviewNote,
  }
  if (patch.clearPendingChanges) row.pending_changes = null
  let query = getClient().from('events').update(row).eq('id', id).eq('status', expectedStatus)
  if (expectedStatus === 'approved') query = query.not('pending_changes', 'is', null)
  const rows = check('Could not decide event', await query.select(EVENT_COLUMNS).returns<RawEvent[]>()) ?? []
  return rows[0] ? toEvent(rows[0]) : null
}

export async function updateEventFields(id: string, fields: Partial<EventFields>, pendingChanges: EventRecord['pendingChanges'] | undefined): Promise<EventRecord | null> {
  if (!UUID.test(id)) return null
  const row = eventFieldsToRow(fields)
  if (pendingChanges !== undefined) {
    // Read-merge-write; not atomic, which is acceptable for the author's own edits.
    const current = await getEvent(id)
    if (!current) return null
    row.pending_changes = { ...(current.pendingChanges ?? {}), ...pendingChanges }
  }
  if (Object.keys(row).length === 0) return getEvent(id)
  const rows = check('Could not update event', await getClient().from('events').update(row).eq('id', id).select(EVENT_COLUMNS).returns<RawEvent[]>()) ?? []
  return rows[0] ? toEvent(rows[0]) : null
}

export async function cancelEvent(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false
  const rows = check('Could not cancel event', await getClient().from('events').update({ status: 'cancelled' })
    .eq('id', id).in('status', ['pending', 'approved', 'hidden']).select('id').returns<{ id: string }[]>()) ?? []
  return rows.length > 0
}

export async function countEventsCreatedSince(userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await getClient().from('events').select('id', { count: 'exact', head: true }).eq('created_by', userId).gte('created_at', sinceIso)
  if (error) throw new Error(`Could not count events: ${error.message}`)
  return count ?? 0
}

export async function reportEvent(eventId: string, userId: string, reason: string | null): Promise<{ inserted: boolean; total: number }> {
  const client = getClient()
  const rows = check('Could not report event', await client.from('event_reports').upsert(
    { event_id: eventId, user_id: userId, reason }, { onConflict: 'event_id,user_id', ignoreDuplicates: true },
  ).select('event_id').returns<{ event_id: string }[]>()) ?? []
  const { count, error } = await client.from('event_reports').select('event_id', { count: 'exact', head: true }).eq('event_id', eventId)
  if (error) throw new Error(`Could not count reports: ${error.message}`)
  return { inserted: rows.length > 0, total: count ?? 0 }
}

// True only for the caller that actually flipped approved -> hidden.
export async function hideEventIfApproved(eventId: string): Promise<boolean> {
  if (!UUID.test(eventId)) return false
  const rows = check('Could not hide event', await getClient().from('events').update({ status: 'hidden' })
    .eq('id', eventId).eq('status', 'approved').select('id').returns<{ id: string }[]>()) ?? []
  return rows.length > 0
}

export async function clearEventReports(eventId: string): Promise<void> {
  const { error } = await getClient().from('event_reports').delete().eq('event_id', eventId)
  if (error) throw new Error(`Could not clear reports: ${error.message}`)
}

export async function listMyReports(userId: string, eventIds: string[]): Promise<string[]> {
  const ids = eventIds.filter((id) => UUID.test(id)).slice(0, 1000)
  if (ids.length === 0) return []
  const rows = check('Could not load reports', await getClient().from('event_reports').select('event_id').eq('user_id', userId).in('event_id', ids).returns<{ event_id: string }[]>()) ?? []
  return rows.map((row) => row.event_id)
}

export type RsvpStatus = 'going' | 'interested'
export type RsvpSummary = { going: number; interested: number; mine: RsvpStatus | null }
const RSVP_EVENT_CAP = 200
const RSVP_PAGE = 1000

export async function setRsvp(eventId: string, userId: string, status: RsvpStatus | null): Promise<void> {
  if (!UUID.test(eventId)) return
  const client = getClient()
  if (status === null) {
    const { error } = await client.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId)
    if (error) throw new Error(`Could not clear RSVP: ${error.message}`)
    return
  }
  const { error } = await client.from('event_rsvps').upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' })
  if (error) throw new Error(`Could not save RSVP: ${error.message}`)
}

// One batched read (paged past PostgREST's row cap), counted in memory: fine for a few hundred students. Never exposes who is going.
export async function getRsvpSummary(eventIds: string[], viewerId: string): Promise<Map<string, RsvpSummary>> {
  const ids = eventIds.filter((id) => UUID.test(id)).slice(0, RSVP_EVENT_CAP)
  const summary = new Map<string, RsvpSummary>(ids.map((id) => [id, { going: 0, interested: 0, mine: null }]))
  if (ids.length === 0) return summary
  for (let from = 0; ; from += RSVP_PAGE) {
    const rows = check('Could not load RSVPs', await getClient().from('event_rsvps').select('event_id, user_id, status').in('event_id', ids)
      .order('event_id').order('user_id').range(from, from + RSVP_PAGE - 1).returns<{ event_id: string; user_id: string; status: RsvpStatus }[]>()) ?? []
    for (const row of rows) {
      const entry = summary.get(row.event_id)
      if (!entry) continue
      entry[row.status] += 1
      if (row.user_id === viewerId) entry.mine = row.status
    }
    if (rows.length < RSVP_PAGE) break
  }
  return summary
}

export async function findEventModeratorIds(ref: ScopeRef): Promise<string[]> {
  const client = getClient()
  const ids = new Set<string>()
  if (ref.scope === 'entity') {
    const admins = check('Could not load moderators', await client.from('entity_members').select('user_id')
      .eq('entity_id', ref.scopeValue ?? '').eq('role', 'admin').is('left_at', null).returns<{ user_id: string }[]>()) ?? []
    for (const row of admins) ids.add(row.user_id)
  }
  const emails = [...superadminEmails]
  if (emails.length > 0) {
    const supers = check('Could not load moderators', await client.from('users').select('id').in('email', emails).returns<{ id: string }[]>()) ?? []
    for (const row of supers) ids.add(row.id)
  }
  return [...ids]
}
