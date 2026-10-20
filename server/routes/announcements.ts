import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { countEntityAnnouncementsSince, createAnnouncement, getEntity, resolveAudience, type EntityRow } from '../social/db.js'
import { loadViewer, requireEntityAdmin, requireSuperadmin, viewerOf } from '../social/guards.js'
import { notify } from '../social/notify.js'
import { validateAnnouncement, type AnnouncementInput } from '../social/validation.js'

const router = Router()
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]
const limit = rateLimit('announcements', 20, 10 * 60_000)
const ENTITY_DAILY_LIMIT = 3
const DAY_MS = 24 * 60 * 60_000

async function send(authorId: string, entityId: string | null, input: AnnouncementInput) {
  const ids = (await resolveAudience(input.audience, input.audienceValue)).filter((id) => id !== authorId)
  const { id } = await createAnnouncement({ authorId, entityId, ...input, recipients: ids.length })
  await notify(ids, { type: 'announcement', entityId, payload: { title: input.title, body: input.body, ...(input.link ? { link: input.link } : {}) } }, { excludeId: authorId })
  return { id, recipients: ids.length }
}

router.post('/api/admin/announcements', ...authedWrite, requireSuperadmin, limit, route('Sending announcement failed', async (req, res) => {
  const parsed = validateAnnouncement(req.body, 'admin')
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (parsed.value.audience === 'entity' && !(await getEntity(parsed.value.audienceValue ?? ''))) return res.status(400).json({ error: 'Entidade inválida' })
  res.status(201).json(await send(viewerOf(res).id, null, parsed.value))
}))

router.post('/api/entities/:id/announcements', ...authedWrite, requireEntityAdmin, limit, route('Sending announcement failed', async (req, res) => {
  const viewer = viewerOf(res)
  const entity = res.locals.entity as EntityRow
  const parsed = validateAnnouncement(req.body, 'entity')
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (!viewer.isSuperadmin && (await countEntityAnnouncementsSince(entity.id, new Date(Date.now() - DAY_MS).toISOString())) >= ENTITY_DAILY_LIMIT) {
    return res.status(429).json({ error: 'Limite de 3 avisos por dia' })
  }
  res.status(201).json(await send(viewer.id, entity.id, { ...parsed.value, audienceValue: entity.id }))
}))

export default router
