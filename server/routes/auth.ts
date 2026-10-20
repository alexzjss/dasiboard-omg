import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { upsertUser } from '../db.js'
import { googleClientId } from '../lib/config.js'
import { logError } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { clearSessionCookie, createSession, requireSession, setSessionCookie, type SessionUser } from '../lib/session.js'

const router = Router()
const googleClient = new OAuth2Client(googleClientId)

router.post('/api/auth/google', isAllowedOrigin, rateLimit('login', 10, 60_000), async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
  if (!credential) return res.status(400).json({ error: 'Google credential is required' })
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId })
    const payload = ticket.getPayload()
    const email = payload?.email?.toLowerCase()
    const isUspAccount = email?.endsWith('@usp.br')
    if (!payload?.sub || !email || payload.email_verified !== true || !isUspAccount) return res.status(403).json({ error: 'Only verified @usp.br accounts are allowed' })
    const user: SessionUser = { sub: payload.sub, name: payload.name || email.split('@')[0], email, picture: payload.picture }
    try {
      await upsertUser(user)
    } catch (error) {
      logError('Saving user failed', error)
      return res.status(503).json({ error: 'Database is not configured or unavailable. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Vercel project.' })
    }
    setSessionCookie(req, res, await createSession(user))
    res.json({ user: { name: user.name, email: user.email, picture: user.picture } })
  } catch (error) {
    logError('Google authentication failed', error)
    res.status(401).json({ error: 'Invalid Google credential' })
  }
})

router.get('/api/auth/me', requireSession, (req, res) => res.json({ user: req.user }))

router.post('/api/auth/logout', isAllowedOrigin, (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

export default router
