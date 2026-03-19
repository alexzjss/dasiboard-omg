import { Router, Request, Response, NextFunction } from 'express'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { kanbanService } from '../services/kanban.service'
import { requireAuth } from '../middlewares/auth'
import { KanbanColumn, KanbanTag } from '../utils/enums'

const router: ExpressRouter = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createCardSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  column: z.nativeEnum(KanbanColumn).default(KanbanColumn.todo),
  tag: z.nativeEnum(KanbanTag).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const updateCardSchema = createCardSchema.partial().extend({
  tag: z.nativeEnum(KanbanTag).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

const reorderSchema = z.object({
  todo: z.array(z.string()),
  doing: z.array(z.string()),
  done: z.array(z.string()),
})

// ─── Controller ───────────────────────────────────────────────────────────────

const controller = {
  async getBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const board = await kanbanService.getBoard(req.user!.sub)
      res.json({ board })
    } catch (err) { next(err) }
  },

  async createCard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCardSchema.parse(req.body)
      const card = await kanbanService.createCard(req.user!.sub, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      })
      res.status(201).json({ card })
    } catch (err) { next(err) }
  },

  async updateCard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateCardSchema.parse(req.body)
      await kanbanService.updateCard(req.user!.sub, req.params['id']!, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      })
      res.json({ message: 'Card atualizado' })
    } catch (err) { next(err) }
  },

  async deleteCard(req: Request, res: Response, next: NextFunction) {
    try {
      await kanbanService.deleteCard(req.user!.sub, req.params['id']!)
      res.json({ message: 'Card removido' })
    } catch (err) { next(err) }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const columns = reorderSchema.parse(req.body)
      await kanbanService.reorder(req.user!.sub, columns)
      res.json({ message: 'Quadro reordenado' })
    } catch (err) { next(err) }
  },

  async clearDone(req: Request, res: Response, next: NextFunction) {
    try {
      await kanbanService.clearDone(req.user!.sub)
      res.json({ message: 'Cards concluídos removidos' })
    } catch (err) { next(err) }
  },
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.use(requireAuth) // todas as rotas do kanban exigem auth

router.get('/', controller.getBoard)
router.post('/', controller.createCard)
router.put('/reorder', controller.reorder)
router.delete('/done', controller.clearDone)
router.put('/:id', controller.updateCard)
router.delete('/:id', controller.deleteCard)

export default router
