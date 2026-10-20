import { Router } from 'express'
import { vapid } from '../lib/config.js'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { deletePushSubscription, savePushSubscription } from '../social/db.js'
import { loadViewer, viewerOf } from '../social/guards.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]
const limit = rateLimit('push-sub', 20, 10 * 60_000)

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/
const validKey = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && BASE64URL.test(value)
const validEndpoint = (value: unknown): value is string => typeof value === 'string' && value.length <= 1000 && value.startsWith('https://') && URL.canParse(value)

router.get('/api/push/public-key', ...authed, (_req, res) => {
  if (!vapid) return res.status(404).json({ error: 'Push desligado' })
  res.json({ publicKey: vapid.publicKey })
})

router.post('/api/push/subscriptions', ...authedWrite, limit, route('Saving push subscription failed', async (req, res) => {
  const { endpoint, keys } = req.body ?? {}
  if (!validEndpoint(endpoint) || !validKey(keys?.p256dh) || !validKey(keys?.auth)) return res.status(400).json({ error: 'Inscrição inválida' })
  await savePushSubscription(viewerOf(res).id, { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } })
  res.status(204).end()
}))

router.delete('/api/push/subscriptions', ...authedWrite, route('Deleting push subscription failed', async (req, res) => {
  const { endpoint } = req.body ?? {}
  if (!validEndpoint(endpoint)) return res.status(400).json({ error: 'Inscrição inválida' })
  await deletePushSubscription(viewerOf(res).id, endpoint)
  res.status(204).end()
}))

export default router
