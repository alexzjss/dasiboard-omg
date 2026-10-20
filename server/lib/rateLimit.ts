import type { NextFunction, Request, Response } from 'express'

// In-memory fixed-window rate limit. On Vercel each instance keeps its own counters.
export function rateLimit(name: string, max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = `${name}:${req.ip}:${req.user?.sub ?? ''}`
    const entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      if (hits.size > 10_000) hits.clear()
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (++entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde um pouco e tente novamente.' })
    }
    next()
  }
}
