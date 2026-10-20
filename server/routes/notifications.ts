import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { requireSession } from '../lib/session.js'
import { countPendingReceived, countUnread, getEntitiesByIds, getPeopleByIds, listNotifications, markAllRead, markRead } from '../social/db.js'
import { loadViewer, viewerOf } from '../social/guards.js'
import { describeNotification } from '../social/notificationText.js'
import { personMini } from '../social/presenters.js'

const router = Router()
const PAGE_SIZE = 20
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]

type Cursor = { at: string; id: string }
const encodeCursor = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url')
function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (typeof parsed?.at === 'string' && typeof parsed?.id === 'string' && parsed.id.length <= 120 && Number.isFinite(Date.parse(parsed.at))) return { at: parsed.at, id: parsed.id }
  } catch { /* fall through */ }
  return null
}

router.get('/api/notifications', ...authed, route('Loading notifications failed', async (req, res) => {
  const viewer = viewerOf(res)
  const rawCursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
  const cursor = rawCursor ? decodeCursor(rawCursor) : null
  if (rawCursor && !cursor) return res.status(400).json({ error: 'Cursor inválido' })

  const rows = await listNotifications(viewer.id, cursor, PAGE_SIZE + 1)
  const page = rows.slice(0, PAGE_SIZE)
  const actorIds = [...new Set(page.flatMap((row) => (row.actorId ? [row.actorId] : [])))]
  const entityIds = [...new Set(page.flatMap((row) => (row.entityId ? [row.entityId] : [])))]
  const [people, entities] = await Promise.all([getPeopleByIds(actorIds), getEntitiesByIds(entityIds)])
  const actors = new Map(people.map((person) => [person.user.id, personMini(person)]))
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]))

  const items = page.map((row) => {
    const actor = row.actorId ? actors.get(row.actorId) ?? null : null
    const { title, body, url } = describeNotification(row, { actor, entityName: row.entityId ? entityNames.get(row.entityId) ?? null : null })
    return { id: row.id, type: row.type, title, body, url, createdAt: row.createdAt, read: row.readAt !== null, actor }
  })
  const last = page[page.length - 1]
  res.json({ items, nextCursor: rows.length > PAGE_SIZE ? encodeCursor({ at: last.createdAt, id: last.id }) : null })
}))

router.get('/api/notifications/count', ...authed, route('Counting notifications failed', async (_req, res) => {
  const viewer = viewerOf(res)
  const [unread, pendingRequests] = await Promise.all([countUnread(viewer.id), countPendingReceived(viewer.id)])
  res.json({ unread, pendingRequests })
}))

router.post('/api/notifications/read-all', ...authedWrite, route('Marking notifications failed', async (_req, res) => {
  await markAllRead(viewerOf(res).id)
  res.status(204).end()
}))

router.post('/api/notifications/:id/read', ...authedWrite, route('Marking notification failed', async (req, res) => {
  const found = await markRead(viewerOf(res).id, String(req.params.id))
  if (!found) return res.status(404).json({ error: 'Notificação não encontrada' })
  res.status(204).end()
}))

export default router
