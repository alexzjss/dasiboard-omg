import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { optionalSession, requireSession } from '../lib/session.js'
import { collectCard, getBadges, getCardSettings, getCardSettingsMany, getConnection, getConnectionsWith, getPersonByHandle, getUnlockStats, isCollected, listCollection, listMembershipsOf, listMembershipsOfMany, uncollectCard, updateCard } from '../social/db.js'
import { syncAutoBadgesAndNotify } from '../social/achievements.js'
import { logError } from '../lib/errors.js'
import { cardUnlocks } from '../social/cardUnlocks.js'
import { isValidHandle } from '../social/handles.js'
import { loadViewer, loadViewerIfAny, NOT_FOUND_PROFILE, viewerOf, type Viewer } from '../social/guards.js'
import { connectionState } from '../social/privacy.js'
import { badgeKey, cardData, type CardData } from '../social/presenters.js'
import type { PersonRecord } from '../social/db.js'
import { validateCardPatch } from '../social/validation.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]

async function buildCard(person: PersonRecord, viewer: CardData['viewer']) {
  const ownerId = person.user.id
  const [{ settings, isPublic }, badges, memberships] = await Promise.all([getCardSettings(ownerId), getBadges([ownerId]), listMembershipsOf(ownerId)])
  const own = badges.get(ownerId) ?? []
  return { settings, isPublic, own, memberships, card: cardData({ person, badges: own, memberships, settings, viewer }) }
}

async function ownPayload(viewer: Viewer) {
  const [built, stats] = await Promise.all([buildCard(viewer.person, { collected: false, connection: 'self' }), getUnlockStats(viewer.id)])
  return { settings: built.settings, public: built.isPublic, unlocks: cardUnlocks(stats), card: built.card }
}

router.get('/api/me/card', ...authed, route('Loading card failed', async (_req, res) => {
  res.json(await ownPayload(viewerOf(res)))
}))

router.patch('/api/me/card', ...authedWrite, route('Updating card failed', async (req, res) => {
  const viewer = viewerOf(res)
  const [stats, memberships, badges] = await Promise.all([getUnlockStats(viewer.id), listMembershipsOf(viewer.id), getBadges([viewer.id])])
  const ctx = {
    unlocks: cardUnlocks(stats),
    entityIds: memberships.map((membership) => membership.entityId),
    badgeKeys: (badges.get(viewer.id) ?? []).filter((badge) => badge.kind !== 'entity_member').map(badgeKey),
  }
  const result = validateCardPatch(req.body, ctx)
  if (!result.ok) return res.status(400).json({ error: result.error })
  await updateCard(viewer.id, result.value)
  res.json(await ownPayload(viewer))
}))

router.get('/api/cards/:handle', optionalSession, rateLimit('card-read', 120, 10 * 60_000), loadViewerIfAny, route('Loading card failed', async (req, res) => {
  const viewer = res.locals.viewer as Viewer | undefined
  const handle = String(req.params.handle ?? '')
  if (!isValidHandle(handle)) return res.status(404).json(NOT_FOUND_PROFILE)
  const person = await getPersonByHandle(handle)
  if (!person) return res.status(404).json(NOT_FOUND_PROFILE)
  const ownerId = person.user.id
  if (!viewer) {
    const { isPublic } = await getCardSettings(ownerId)
    if (!isPublic) return res.status(401).json({ error: 'Entre para ver esta carta' })
    return res.json((await buildCard(person, null)).card)
  }
  const [connection, collected] = await Promise.all([getConnection(viewer.id, ownerId), isCollected(viewer.id, ownerId)])
  res.json((await buildCard(person, { collected, connection: connectionState(viewer.id, ownerId, connection) })).card)
}))

router.post('/api/cards/:handle/collect', ...authedWrite, rateLimit('collect', 60, 10 * 60_000), route('Collecting card failed', async (req, res) => {
  const viewer = viewerOf(res)
  const handle = String(req.params.handle ?? '')
  if (!isValidHandle(handle)) return res.status(404).json(NOT_FOUND_PROFILE)
  const person = await getPersonByHandle(handle)
  if (!person) return res.status(404).json(NOT_FOUND_PROFILE)
  if (person.user.id === viewer.id) return res.status(400).json({ error: 'Essa carta já é sua' })
  const status = await collectCard(viewer.id, person.user.id)
  // Achievements must never break the collect itself.
  if (status === 'collected') {
    try { await syncAutoBadgesAndNotify(viewer.id) } catch (error) { logError('Syncing collector badges failed', error) }
  }
  res.json({ status })
}))

router.delete('/api/cards/:handle/collect', ...authedWrite, route('Removing card failed', async (req, res) => {
  const handle = String(req.params.handle ?? '')
  if (!isValidHandle(handle)) return res.status(404).json(NOT_FOUND_PROFILE)
  const person = await getPersonByHandle(handle)
  if (!person) return res.status(404).json(NOT_FOUND_PROFILE)
  await uncollectCard(viewerOf(res).id, person.user.id)
  res.status(204).end()
}))

const COLLECTION_PAGE = 24
type Cursor = { at: string; id: string }
const encodeCursor = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url')
function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (typeof parsed?.at === 'string' && typeof parsed?.id === 'string' && parsed.id.length <= 120 && Number.isFinite(Date.parse(parsed.at))) return { at: parsed.at, id: parsed.id }
  } catch { /* fall through */ }
  return null
}

router.get('/api/me/collection', ...authed, route('Loading collection failed', async (req, res) => {
  const viewer = viewerOf(res)
  const rawCursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
  const cursor = rawCursor ? decodeCursor(rawCursor) : null
  if (rawCursor && !cursor) return res.status(400).json({ error: 'Cursor inválido' })
  const rows = await listCollection(viewer.id, cursor, COLLECTION_PAGE + 1)
  const page = rows.slice(0, COLLECTION_PAGE)
  const ids = page.map((row) => row.person.user.id)
  const [badges, memberships, settings, connections] = await Promise.all([getBadges(ids), listMembershipsOfMany(ids), getCardSettingsMany(ids), getConnectionsWith(viewer.id, ids)])
  const items = page.map(({ person }) => {
    const id = person.user.id
    return cardData({ person, badges: badges.get(id) ?? [], memberships: memberships.get(id) ?? [], settings: settings.get(id)!.settings, viewer: { collected: true, connection: connectionState(viewer.id, id, connections.find((c) => c.requester_id === id || c.addressee_id === id)) } })
  })
  const last = page[page.length - 1]
  res.json({ items, nextCursor: rows.length > COLLECTION_PAGE ? encodeCursor({ at: last.collectedAt, id: last.person.user.id }) : null })
}))

export default router
