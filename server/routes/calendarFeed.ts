import { createHash, randomBytes } from 'node:crypto'
import { Router, type Request } from 'express'
import { allowedOrigins, frontendUrl } from '../lib/config.js'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { buildIcs, type IcsEvent } from '../events/ics.js'
import { canView } from '../events/rules.js'
import {
  findUserIdByFeedTokenHash, getEntitiesByIds, getEventActor, getScheduleEntries, hasCalendarFeedToken, listEventsInRange, setCalendarFeedTokenHash,
} from '../social/db.js'
import { loadViewer, viewerOf } from '../social/guards.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer, rateLimit('calendar-feed-token', 10, 10 * 60_000)]
const DAY_MS = 86_400_000
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/ // 32 random bytes in base64url

// 32 random bytes: the token is high-entropy, so a plain SHA-256 is enough; only the hash is stored.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

function feedUrl(req: Request, token: string) {
  const origin = req.get('origin')
  const base = origin && allowedOrigins.has(origin) ? origin : new URL(frontendUrl).origin
  return `${base}/api/calendar-feed/${token}.ics`
}

router.get('/api/calendar-feed/status', ...authed, route('Loading calendar feed status failed', async (_req, res) => {
  res.json({ enabled: await hasCalendarFeedToken(viewerOf(res).id) })
}))

router.post('/api/calendar-feed/token', ...authedWrite, route('Creating calendar feed token failed', async (req, res) => {
  const token = randomBytes(32).toString('base64url')
  await setCalendarFeedTokenHash(viewerOf(res).id, hashToken(token))
  res.json({ url: feedUrl(req, token) })
}))

router.delete('/api/calendar-feed/token', ...authedWrite, route('Disabling calendar feed failed', async (_req, res) => {
  await setCalendarFeedTokenHash(viewerOf(res).id, null)
  res.status(204).end()
}))

// Public: the token is the credential. Unknown and malformed tokens look the same (404, no body).
router.get('/api/calendar-feed/:file', rateLimit('calendar-feed', 60, 10 * 60_000), route('Serving calendar feed failed', async (req, res) => {
  const file = String(req.params.file ?? '')
  const token = file.endsWith('.ics') ? file.slice(0, -4) : ''
  if (!TOKEN_RE.test(token)) return res.status(404).end()
  const userId = await findUserIdByFeedTokenHash(hashToken(token))
  if (!userId) return res.status(404).end()

  // The owner counts as a regular student: no moderation queue in the feed, not even for a superadmin.
  const actor = await getEventActor(userId, false)
  const now = new Date()
  const found = await listEventsInRange(new Date(now.getTime() - 30 * DAY_MS).toISOString(), new Date(now.getTime() + 180 * DAY_MS).toISOString(), {
    classCodes: [...actor.classCodes], entityIds: [...actor.memberships.keys()], includeOtherClasses: false,
    viewerId: userId, moderatesAll: false, moderatedEntityIds: [],
  })
  const visible = found.filter((e) => e.status === 'approved' && canView(actor, e, { otherClasses: false }))
  const entities = await getEntitiesByIds(visible.filter((e) => e.scope === 'entity').map((e) => e.scopeValue ?? ''))
  const names = new Map(entities.map((e) => [e.id, e.name] as const))
  const events: IcsEvent[] = visible.map((e) => ({
    ...e,
    scopeLabel: e.scope === 'usp' ? 'USP' : e.scope === 'cohort' ? `Turma de ${e.scopeValue}` : e.scope === 'entity' ? names.get(e.scopeValue ?? '') ?? e.scopeValue ?? '' : e.scopeValue ?? '',
  }))
  const classes = await getScheduleEntries(userId)

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'private, max-age=900')
  res.setHeader('Content-Disposition', 'inline; filename="dasiboard.ics"')
  res.send(buildIcs({ calendarName: 'Dasiboard', events, classes, now }))
}))

export default router
