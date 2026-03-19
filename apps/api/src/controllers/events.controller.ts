import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { eventsService } from '../services/events.service'
import { EventStatus, EventType } from '../utils/enums'

const eventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  type: z.nativeEnum(EventType),
  turmas: z.array(z.string()).optional().default([]),
  entidadeId: z.string().uuid().optional(),
})

export const eventsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { turma, type, month, year } = req.query
      const events = await eventsService.list({
        turma: turma as string | undefined,
        type: type as EventType | undefined,
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
      })
      res.json({ events })
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.getById(req.params['id']!)
      res.json({ event })
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = eventSchema.parse(req.body)
      const event = await eventsService.create({
        ...data,
        date: new Date(data.date),
        createdById: req.user?.sub,
        status: EventStatus.published, // admin cria direto como publicado
      })
      res.status(201).json({ event })
    } catch (err) {
      next(err)
    }
  },

  async submitPending(req: Request, res: Response, next: NextFunction) {
    try {
      const data = eventSchema.parse(req.body)
      const event = await eventsService.create({
        ...data,
        date: new Date(data.date),
        createdById: req.user?.sub,
        status: EventStatus.pending, // usuário comum: aguarda aprovação
      })
      res.status(201).json({ event, message: 'Evento enviado para aprovação' })
    } catch (err) {
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = eventSchema.partial().parse(req.body)
      const event = await eventsService.update(req.params['id']!, {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      })
      res.json({ event })
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await eventsService.delete(req.params['id']!)
      res.json({ message: 'Evento removido' })
    } catch (err) {
      next(err)
    }
  },

  async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventsService.listPending()
      res.json({ events })
    } catch (err) {
      next(err)
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.approve(req.params['id']!)
      res.json({ event })
    } catch (err) {
      next(err)
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.reject(req.params['id']!)
      res.json({ event })
    } catch (err) {
      next(err)
    }
  },
}
