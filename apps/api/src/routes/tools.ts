import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../middlewares/auth'

const toolKeySchema = z.enum(['notes', 'flashcards', 'checklist'])

const router = Router()
router.use(requireAuth)

// GET /api/tools/:key  — busca dados de uma ferramenta
router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = toolKeySchema.parse(req.params['key'])
    const record = await prisma.toolData.findUnique({
      where: { userId_toolKey: { userId: req.user!.sub, toolKey: key } },
    })
    res.json({ data: record?.data ?? null })
  } catch (err) { next(err) }
})

// PUT /api/tools/:key  — salva/atualiza dados de uma ferramenta
router.put('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = toolKeySchema.parse(req.params['key'])
    const record = await prisma.toolData.upsert({
      where: { userId_toolKey: { userId: req.user!.sub, toolKey: key } },
      create: { userId: req.user!.sub, toolKey: key, data: req.body },
      update: { data: req.body },
    })
    res.json({ data: record.data })
  } catch (err) { next(err) }
})

export default router
