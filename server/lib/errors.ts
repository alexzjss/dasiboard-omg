export function logError(context: string, error: unknown) {
  console.error(context, error instanceof Error ? error.message : error)
}

import type { NextFunction, Request, RequestHandler, Response } from 'express'

// Wraps an async route: any thrown error is logged and answered with a generic 503.
export function route(label: string, handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try { await handler(req, res, next) }
    catch (error) {
      logError(label, error)
      if (!res.headersSent) res.status(503).json({ error: 'Não foi possível concluir a operação' })
    }
  }
}
