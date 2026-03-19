import { Request, Response } from 'express'

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: `Rota não encontrada: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  })
}
