import { Request, Response, NextFunction } from 'express'

/** Middleware: loga método, path, status e tempo de resposta */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const color =
      res.statusCode >= 500 ? '\x1b[31m' :  // red
      res.statusCode >= 400 ? '\x1b[33m' :  // yellow
      res.statusCode >= 300 ? '\x1b[36m' :  // cyan
      '\x1b[32m'                             // green
    console.log(
      `${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`,
    )
  })
  next()
}
