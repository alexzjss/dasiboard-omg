import { Router, type Request, type Response } from 'express'
import { logError, route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import {
  acceptConnection, countPendingReceived, createConnection, deleteConnection, findUserIdsByCourse, findUserIdsByEntity, getBadges, getConnection,
  getConnectionsWith, getCourses, getCoursesByUsers, getPeopleByIds, getPersonByHandle, listConnectionsOf, listFeedCandidates,
  listMembershipsOf, listPendingReceived, findUserIdsByCourses, searchPeople, updateProfile,
  type FeedCandidate, type FeedCursor, type PersonRecord,
} from '../social/db.js'
import { syncAutoBadges } from '../social/achievements.js'
import { loadViewer, NOT_FOUND_PROFILE, viewerOf, type Viewer } from '../social/guards.js'
import { personCard, personMini } from '../social/presenters.js'
import { canSee, connectionState, relationBetween, type ConnectionRow, type ProfileItem } from '../social/privacy.js'
import { COURSE_CODE_PATTERN, ENTITY_ID_PATTERN, validateProfilePatch } from '../social/validation.js'
import { isValidHandle } from '../social/handles.js'

const router = Router()
const PAGE_SIZE = 20
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]

const owner = (person: PersonRecord) => ({ id: person.user.id, showCourses: person.profile.show_courses, showConnections: person.profile.show_connections })

// The one place that turns "viewer + target person + known connection rows" into an allow/deny.
function visible(viewer: Viewer, person: PersonRecord, item: ProfileItem, connections: ConnectionRow[]) {
  const row = connections.find((c) => c.requester_id === person.user.id || c.addressee_id === person.user.id)
  return canSee(viewer, owner(person), item, relationBetween(viewer.id, person.user.id, row))
}

const stateOf = (viewer: Viewer, personId: string, connections: ConnectionRow[]) =>
  connectionState(viewer.id, personId, connections.find((c) => c.requester_id === personId || c.addressee_id === personId))

const queryString = (req: Request, key: string) => (typeof req.query[key] === 'string' ? (req.query[key] as string) : undefined)

// ---------- own profile ----------

// Automatic badges must never break the request that triggered them.
async function syncBadgesSafely(...userIds: string[]) {
  for (const userId of userIds) {
    try { await syncAutoBadges(userId) }
    catch (error) { logError('Syncing automatic badges failed', error) }
  }
}

async function ownProfile(viewer: Viewer) {
  const [memberships, pending, courses, badges] = await Promise.all([listMembershipsOf(viewer.id), listPendingReceived(viewer.id), getCourses(viewer.id), getBadges([viewer.id])])
  const { profile } = viewer.person
  return {
    profile: {
      handle: profile.handle, name: viewer.name, email: viewer.email, picture: viewer.picture, bio: profile.bio, course: profile.course,
      entryYear: profile.entry_year, links: profile.links, technologies: profile.technologies, hasCustomAvatar: profile.avatar_path !== null, showCourses: profile.show_courses, showConnections: profile.show_connections,
    },
    entities: memberships,
    badges: badges.get(viewer.id) ?? [],
    adminOf: memberships.filter((m) => m.role === 'admin').map((m) => m.entityId),
    isSuperadmin: viewer.isSuperadmin,
    courses,
    pendingCount: pending.length,
    pendingRequests: pending.map(({ person, createdAt }) => ({ ...personMini(person), course: person.profile.course, createdAt })),
  }
}

router.get('/api/me/profile', ...authed, route('Loading own profile failed', async (_req, res) => {
  res.json(await ownProfile(viewerOf(res)))
}))

router.patch('/api/me/profile', ...authedWrite, route('Updating profile failed', async (req, res) => {
  const result = validateProfilePatch(req.body)
  if (!result.ok) return res.status(400).json({ error: result.error })
  const viewer = viewerOf(res)
  await updateProfile(viewer.id, result.value)
  viewer.person = { ...viewer.person, profile: { ...viewer.person.profile, ...result.value } }
  await syncBadgesSafely(viewer.id)
  res.json(await ownProfile(viewer))
}))

// ---------- people ----------

router.get('/api/people', ...authed, route('Listing people failed', async (req, res) => {
  const viewer = viewerOf(res)
  const q = queryString(req, 'q')?.trim()
  const curso = queryString(req, 'curso')?.trim()
  const anoRaw = queryString(req, 'ano')
  const entidade = queryString(req, 'entidade')
  const materia = queryString(req, 'materia')?.trim().toUpperCase()
  const cursor = queryString(req, 'cursor')
  const ano = anoRaw === undefined ? undefined : Number(anoRaw)
  if ((q && q.length > 60) || (curso && curso.length > 80) || (anoRaw !== undefined && !(Number.isInteger(ano) && ano! >= 1934 && ano! <= 2100))
    || (entidade && !ENTITY_ID_PATTERN.test(entidade)) || (materia && !COURSE_CODE_PATTERN.test(materia)) || (cursor && !isValidHandle(cursor))) {
    return res.status(400).json({ error: 'Filtros inválidos' })
  }

  let userIds: string[] | undefined
  if (materia) {
    // Filtering by course would reveal who takes it, so only people whose course list the viewer may see count.
    const ids = await findUserIdsByCourse(materia)
    const [people, connections] = await Promise.all([getPeopleByIds(ids), getConnectionsWith(viewer.id, ids)])
    userIds = people.filter((person) => visible(viewer, person, 'courses', connections)).map((person) => person.user.id)
  }
  if (entidade) {
    const members = await findUserIdsByEntity(entidade)
    userIds = userIds ? userIds.filter((id) => members.includes(id)) : members
  }

  const rows = await searchPeople({ q: q || undefined, curso: curso || undefined, ano, userIds, excludeUserId: viewer.id, cursor, limit: PAGE_SIZE + 1 })
  const page = rows.slice(0, PAGE_SIZE)
  const ids = page.map((person) => person.user.id)
  const [connections, badges, courseMap, myCourses] = await Promise.all([getConnectionsWith(viewer.id, ids), getBadges(ids), getCoursesByUsers(ids), getCourses(viewer.id)])
  const mine = new Set(myCourses.map((course) => course.code))
  const people = page.map((person) => {
    const common = visible(viewer, person, 'courses', connections) ? (courseMap.get(person.user.id) ?? []).filter((course) => mine.has(course.code)).length : null
    return personCard(person, badges.get(person.user.id) ?? [], stateOf(viewer, person.user.id, connections), common)
  })
  res.json({ people, nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].profile.handle : null })
}))

router.get('/api/people/:handle', ...authed, route('Loading person failed', async (req, res) => {
  const viewer = viewerOf(res)
  const handle = String(req.params.handle ?? '')
  // Invalid, unknown and hidden profiles all answer exactly the same thing.
  if (!isValidHandle(handle)) return res.status(404).json(NOT_FOUND_PROFILE)
  const person = await getPersonByHandle(handle)
  if (!person) return res.status(404).json(NOT_FOUND_PROFILE)
  const ownerId = person.user.id
  const connection = await getConnection(viewer.id, ownerId)
  const connections = connection ? [connection] : []
  if (!visible(viewer, person, 'profile', connections)) return res.status(404).json(NOT_FOUND_PROFILE)

  const [badges, myCourses, memberships] = await Promise.all([getBadges([ownerId]), getCourses(viewer.id), listMembershipsOf(ownerId)])
  const showCourses = visible(viewer, person, 'courses', connections)
  const showConnections = visible(viewer, person, 'connections', connections)
  const mine = new Set(myCourses.map((course) => course.code))

  let courses: { code: string; title: string; common: boolean }[] | null = null
  let classmates: ReturnType<typeof personMini>[] | null = null
  if (showCourses) {
    const theirs = await getCourses(ownerId)
    courses = theirs.map((course) => ({ code: course.code, title: course.title, common: mine.has(course.code) }))
    if (viewer.id !== ownerId) classmates = await mutualClassmates(viewer, person, myCourses.map((c) => c.code), theirs.map((c) => c.code))
  }
  let connectionList: { count: number; people: ReturnType<typeof personMini>[] } | null = null
  if (showConnections) {
    // Each listed connection also exposes the other person's connections, so they must allow it too (same rule as the feed).
    const list = await listConnectionsOf(ownerId)
    const listConnections = await getConnectionsWith(viewer.id, list.map((p) => p.user.id))
    const shown = viewer.id === ownerId ? list : list.filter((p) => p.user.id === viewer.id || visible(viewer, p, 'connections', listConnections))
    connectionList = { count: shown.length, people: shown.map(personMini) }
  }

  res.json({
    profile: { ...personMini(person), course: person.profile.course, entryYear: person.profile.entry_year, bio: person.profile.bio, links: person.profile.links, technologies: person.profile.technologies, self: viewer.id === ownerId },
    connection: connectionState(viewer.id, ownerId, connection),
    badges: badges.get(ownerId) ?? [],
    entities: memberships.map(({ entityId, name, title }) => ({ entityId, name, title })),
    courses,
    commonCourses: courses ? courses.filter((course) => course.common).length : null,
    classmatesInCommon: classmates,
    connections: connectionList,
    visibility: { courses: showCourses, connections: showConnections },
  })
}))

// People who share at least one course with the viewer AND at least one with the profile owner,
// limited to those whose own course list the viewer is allowed to see.
async function mutualClassmates(viewer: Viewer, target: PersonRecord, viewerCodes: string[], targetCodes: string[]) {
  const exclude = [viewer.id, target.user.id]
  const [withViewer, withTarget] = await Promise.all([findUserIdsByCourses(viewerCodes, exclude), findUserIdsByCourses(targetCodes, exclude)])
  const targetSet = new Set(withTarget)
  const ids = withViewer.filter((id) => targetSet.has(id)).slice(0, 100)
  if (ids.length === 0) return []
  const [people, connections] = await Promise.all([getPeopleByIds(ids), getConnectionsWith(viewer.id, ids)])
  return people.filter((person) => visible(viewer, person, 'courses', connections)).slice(0, 12).map(personMini)
}

// ---------- connections ----------

async function resolveTarget(req: Request, res: Response, viewer: Viewer) {
  const handle = String(req.params.handle ?? '')
  const person = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  if (!person) { res.status(404).json(NOT_FOUND_PROFILE); return null }
  if (person.user.id === viewer.id) { res.status(400).json({ error: 'Você não pode se conectar consigo mesmo' }); return null }
  return person
}

const connectLimit = rateLimit('connect', 30, 10 * 60_000)

router.post('/api/connections/:handle', ...authedWrite, connectLimit, route('Connecting failed', async (req, res) => {
  const viewer = viewerOf(res)
  const target = await resolveTarget(req, res, viewer)
  if (!target) return
  const targetId = target.user.id

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await getConnection(viewer.id, targetId)
    if (existing?.status === 'accepted') return res.json({ status: 'accepted' })
    if (existing?.requester_id === viewer.id) return res.json({ status: 'pending' }) // idempotent
    if (existing) { // the other person already asked: accept
      await acceptConnection(targetId, viewer.id)
      await syncBadgesSafely(viewer.id, targetId)
      return res.json({ status: 'accepted' })
    }
    if ((await createConnection(viewer.id, targetId)) === 'created') return res.status(201).json({ status: 'pending' })
    // 'exists': lost a race with the reverse request; loop to re-read and accept it
  }
  res.status(409).json({ error: 'Tente novamente' })
}))

router.post('/api/connections/:handle/accept', ...authedWrite, route('Accepting connection failed', async (req, res) => {
  const viewer = viewerOf(res)
  const target = await resolveTarget(req, res, viewer)
  if (!target) return
  const existing = await getConnection(viewer.id, target.user.id)
  if (existing?.status === 'accepted') return res.json({ status: 'accepted' })
  // Only the addressee may accept: a pending request that I sent cannot be accepted by me.
  if (!existing || existing.addressee_id !== viewer.id || !(await acceptConnection(target.user.id, viewer.id))) {
    return res.status(404).json({ error: 'Pedido não encontrado' })
  }
  await syncBadgesSafely(viewer.id, target.user.id)
  res.json({ status: 'accepted' })
}))

router.delete('/api/connections/:handle', ...authedWrite, route('Removing connection failed', async (req, res) => {
  const viewer = viewerOf(res)
  const target = await resolveTarget(req, res, viewer)
  if (!target) return
  await deleteConnection(viewer.id, target.user.id) // decline, cancel or unfriend; idempotent
  res.status(204).end()
}))

router.get('/api/connections', ...authed, route('Listing connections failed', async (req, res) => {
  const viewer = viewerOf(res)
  const status = queryString(req, 'status') ?? 'accepted'
  if (status !== 'pending' && status !== 'accepted') return res.status(400).json({ error: 'Status inválido' })
  if (status === 'pending') {
    const pending = await listPendingReceived(viewer.id)
    return res.json({ connections: pending.map(({ person, createdAt }) => ({ ...personMini(person), course: person.profile.course, createdAt })) })
  }
  const people = await listConnectionsOf(viewer.id)
  res.json({ connections: people.map((person) => ({ ...personMini(person), course: person.profile.course })) })
}))

router.get('/api/notifications/count', ...authed, route('Counting notifications failed', async (_req, res) => {
  res.json({ pendingRequests: await countPendingReceived(viewerOf(res).id) })
}))

// ---------- feed ----------

const FEED_SOURCE_CAP = 60
const keyOf = (event: { at: string; id: string }) => ({ ms: Date.parse(event.at), id: event.id })
const compare = (a: { at: string; id: string }, b: { at: string; id: string }) => {
  const ka = keyOf(a), kb = keyOf(b)
  return ka.ms - kb.ms || (ka.id < kb.id ? -1 : ka.id > kb.id ? 1 : 0)
}

export const encodeFeedCursor = (cursor: FeedCursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url')
function decodeFeedCursor(raw: string): FeedCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (typeof parsed?.at === 'string' && typeof parsed?.id === 'string' && parsed.id.length <= 120 && Number.isFinite(Date.parse(parsed.at))) return { at: parsed.at, id: parsed.id }
  } catch { /* fall through */ }
  return null
}

router.get('/api/feed', ...authed, route('Loading feed failed', async (req, res) => {
  const viewer = viewerOf(res)
  const rawCursor = queryString(req, 'cursor')
  const cursor = rawCursor ? decodeFeedCursor(rawCursor) : null
  if (rawCursor && !cursor) return res.status(400).json({ error: 'Cursor inválido' })

  const all = await listFeedCandidates(viewer.id, cursor, FEED_SOURCE_CAP)
  const fresh = cursor ? all.filter((event) => compare(event, cursor) < 0) : all

  // A source that returned a full page may hide older events. Everything at or above `boundary`
  // is complete; older events are fetched with the next page.
  const types: FeedCandidate['type'][] = ['entity_join', 'connection', 'classmate_joined']
  let boundary: FeedCandidate | null = null
  for (const type of types) {
    const ofType = all.filter((event) => event.type === type)
    if (ofType.length < FEED_SOURCE_CAP) continue
    const oldest = ofType.reduce((a, b) => (compare(a, b) <= 0 ? a : b))
    if (!boundary || compare(oldest, boundary) > 0) boundary = oldest
  }
  const complete = (boundary ? fresh.filter((event) => compare(event, boundary!) >= 0) : fresh).sort((a, b) => compare(b, a))

  const ids = [...new Set(complete.flatMap((event) => (event.type === 'connection' ? [event.userId, event.otherUserId] : [event.userId])))]
  const [people, connections] = await Promise.all([getPeopleByIds(ids), getConnectionsWith(viewer.id, ids)])
  const byId = new Map(people.map((person) => [person.user.id, person]))

  const events: { id: string; at: string; item: Record<string, unknown> }[] = []
  for (const event of complete) {
    const person = byId.get(event.userId)
    if (!person || person.user.id === viewer.id) continue
    if (event.type === 'entity_join') {
      if (!visible(viewer, person, 'entities', connections)) continue
      events.push({ id: event.id, at: event.at, item: { type: event.type, at: event.at, person: personMini(person), entity: { id: event.entityId, name: event.entityName } } })
    } else if (event.type === 'connection') {
      const other = byId.get(event.otherUserId)
      if (!other || other.user.id === viewer.id) continue
      // A connection exposes both people's connection lists, so both must allow the viewer.
      if (!visible(viewer, person, 'connections', connections) || !visible(viewer, other, 'connections', connections)) continue
      events.push({ id: event.id, at: event.at, item: { type: event.type, at: event.at, person: personMini(person), other: personMini(other) } })
    } else {
      // "Classmate joined" reveals a shared course, so it obeys the course visibility.
      if (!visible(viewer, person, 'courses', connections)) continue
      events.push({ id: event.id, at: event.at, item: { type: event.type, at: event.at, person: personMini(person) } })
    }
  }

  const page = events.slice(0, PAGE_SIZE)
  let nextCursor: string | null = null
  if (events.length > PAGE_SIZE) nextCursor = encodeFeedCursor({ at: page[page.length - 1].at, id: page[page.length - 1].id })
  else if (boundary) nextCursor = encodeFeedCursor({ at: boundary.at, id: boundary.id })
  res.json({ items: page.map((event) => ({ id: event.id, ...event.item })), nextCursor })
}))

export default router
