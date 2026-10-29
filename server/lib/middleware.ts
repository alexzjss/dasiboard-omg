import type { NextFunction, Request, Response } from 'express'
import { allowedOrigins, isProduction } from './config.js'

export function isAllowedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin')
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'Origin not allowed' })
  next()
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
}

// Safety net: every state-changing request is origin-checked, even on routes that forget isAllowedOrigin.
export function enforceOriginOnWrites(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  return isAllowedOrigin(req, res, next)
}
