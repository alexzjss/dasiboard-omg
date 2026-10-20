import type { NextFunction, Request, Response } from 'express'
import { allowedOrigins } from './config.js'

export function isAllowedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin')
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'Origin not allowed' })
  next()
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
}
