import type { NextFunction, Request, Response } from 'express'
import { jwtVerify, SignJWT } from 'jose'
import { isProduction, sessionSecret } from './config.js'

export type SessionUser = { sub: string; name: string; email: string; picture?: string }

declare global {
  namespace Express {
    interface Request { user?: SessionUser }
  }
}

const sessionKey = new TextEncoder().encode(sessionSecret)
const sessionCookie = 'orbe_session'
const sessionDays = 30
const renewAfterSeconds = 24 * 60 * 60

export async function createSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${sessionDays}d`)
    .sign(sessionKey)
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: isProduction || req.secure,
    sameSite: 'lax',
    maxAge: sessionDays * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookie, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' })
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[sessionCookie]
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const { payload } = await jwtVerify(token, sessionKey, { algorithms: ['HS256'] })
    req.user = { sub: String(payload.sub), name: String(payload.name), email: String(payload.email), picture: payload.picture ? String(payload.picture) : undefined }
    // Sliding session: reissue the token once it is older than a day
    if (typeof payload.iat === 'number' && Date.now() / 1000 - payload.iat > renewAfterSeconds) {
      setSessionCookie(req, res, await createSession(req.user))
    }
    next()
  } catch { res.status(401).json({ error: 'Invalid or expired session' }) }
}
