import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { SignJWT, jwtVerify } from 'jose'
import { getSchedule, saveSchedule, type ScheduleEntry, upsertUser } from './db.js'
import { fetchJupiterSchedule } from './jupiter.js'

type SessionUser = { sub: string; name: string; email: string; picture?: string }

declare global {
  namespace Express {
    interface Request { user?: SessionUser }
  }
}

const port = Number(process.env.PORT || 3000)
const googleClientId = process.env.GOOGLE_CLIENT_ID
const sessionSecret = process.env.SESSION_SECRET
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

if (!googleClientId || !sessionSecret) {
  throw new Error('GOOGLE_CLIENT_ID and SESSION_SECRET are required')
}
if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters')
}

const app = express()
const googleClient = new OAuth2Client(googleClientId)
const sessionKey = new TextEncoder().encode(sessionSecret)
const sessionCookie = 'orbe_session'
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = new Set([frontendUrl, ...(isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])])

app.set('trust proxy', 1)
app.use(cors({ origin: (origin, callback) => callback(null, origin ? allowedOrigins.has(origin) : true), credentials: true }))
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())

function isAllowedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin')
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'Origin not allowed' })
  next()
}

async function createSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(sessionKey)
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[sessionCookie]
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const { payload } = await jwtVerify(token, sessionKey, { algorithms: ['HS256'] })
    req.user = { sub: String(payload.sub), name: String(payload.name), email: String(payload.email), picture: payload.picture ? String(payload.picture) : undefined }
    next()
  } catch { res.status(401).json({ error: 'Invalid or expired session' }) }
}

function requireSessionInProduction(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') return next()
  return requireSession(req, res, next)
}

app.post('/api/auth/google', isAllowedOrigin, async (req, res) => {
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
      console.error(error)
      return res.status(503).json({ error: 'Database is not configured or unavailable' })
    }
    setSessionCookie(res, await createSession(user))
    res.json({ user: { name: user.name, email: user.email, picture: user.picture } })
  } catch { res.status(401).json({ error: 'Invalid Google credential' }) }
})

app.get('/api/auth/me', requireSession, (req, res) => res.json({ user: req.user }))

app.get('/api/schedule', requireSession, async (req, res) => {
  try { res.json(await getSchedule(req.user!.sub)) }
  catch (error) { console.error(error); res.status(503).json({ error: 'Não foi possível carregar a grade horária' }) }
})

app.put('/api/schedule', isAllowedOrigin, requireSession, async (req, res) => {
  const entries = req.body?.entries
  if (!Array.isArray(entries) || entries.length > 200) return res.status(400).json({ error: 'A grade horária é inválida' })
  const validEntries = entries.every((entry: ScheduleEntry) => Number.isInteger(entry.weekday) && entry.weekday >= 0 && entry.weekday <= 6
    && /^\d{2}:\d{2}$/.test(entry.startsAt) && /^\d{2}:\d{2}$/.test(entry.endsAt)
    && typeof entry.title === 'string' && typeof entry.code === 'string' && typeof entry.room === 'string' && typeof entry.building === 'string')
  if (!validEntries) return res.status(400).json({ error: 'A grade horária é inválida' })
  try { res.json(await saveSchedule(req.user!.sub, entries)) }
  catch (error) { console.error(error); res.status(503).json({ error: 'Não foi possível salvar a grade horária' }) }
})

app.post('/api/schedule/jupiter', isAllowedOrigin, requireSessionInProduction, async (req, res) => {
  const codpes = typeof req.body?.codpes === 'string' ? req.body.codpes.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const codpgm = typeof req.body?.codpgm === 'string' ? req.body.codpgm.trim() : ''
  if (!/^\d{1,10}$/.test(codpes) || !password || !/^\d+$/.test(codpgm)) return res.status(400).json({ error: 'Informe número USP, senha e programa.' })
  try {
    const entries = await fetchJupiterSchedule(codpes, password, codpgm)
    if (req.user) return res.json(await saveSchedule(req.user.sub, entries))
    res.json({ entries, importedAt: null })
  } catch (error) {
    console.error(error)
    res.status(502).json({ error: error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb' })
  }
})

app.post('/api/auth/logout', isAllowedOrigin, (_req, res) => {
  res.clearCookie(sessionCookie, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' })
  res.status(204).end()
})

export default app

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Auth server listening on port ${port}`))
}
