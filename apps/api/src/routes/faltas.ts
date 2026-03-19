import { Router, Request, Response, NextFunction } from 'express'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../middlewares/auth'

const router: ExpressRouter = Router()

const absenceSchema = z.object({
  disciplineName: z.string().min(1),
  totalClasses: z.number().int().min(0),
  absences: z.number().int().min(0),
})

const service = {
  async getAll(userId: string) {
    return prisma.userAbsence.findMany({
      where: { userId },
      orderBy: { disciplineCode: 'asc' },
    })
  },

  async upsert(userId: string, disciplineCode: string, data: {
    disciplineName: string
    totalClasses: number
    absences: number
  }) {
    return prisma.userAbsence.upsert({
      where: { userId_disciplineCode: { userId, disciplineCode } },
      create: { userId, disciplineCode, ...data },
      update: data,
    })
  },

  async delete(userId: string, disciplineCode: string) {
    await prisma.userAbsence.deleteMany({ where: { userId, disciplineCode } })
  },
}

router.use(requireAuth)

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const absences = await service.getAll(req.user!.sub)
    res.json({ absences })
  } catch (err) { next(err) }
})

router.put('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = absenceSchema.parse(req.body)
    const abs = await service.upsert(req.user!.sub, req.params['code']!, data)
    res.json({ absence: abs })
  } catch (err) { next(err) }
})

router.delete('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(req.user!.sub, req.params['code']!)
    res.json({ message: 'Disciplina removida' })
  } catch (err) { next(err) }
})

export default router
