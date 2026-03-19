import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt'
import { Errors } from '../utils/errors'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload
    }
  }
}

/** Middleware: exige autenticação via Bearer token no header Authorization */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw Errors.unauthorized()

    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(Errors.unauthorized('Token expirado'))
    } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
      next(Errors.unauthorized('Token inválido'))
    } else {
      next(err)
    }
  }
}

/** Middleware: exige uma das roles listadas */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized())
    if (!roles.includes(req.user.role)) return next(Errors.forbidden())
    next()
  }
}

/** Middleware: autenticação opcional — não falha se não houver token */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7)
      req.user = verifyAccessToken(token)
    }
  } catch {
    // Token inválido/expirado em rotas opcionais: ignora silenciosamente
  }
  next()
}
