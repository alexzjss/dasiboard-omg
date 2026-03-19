import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole } from '../middlewares/auth'
import { MaterialType } from '@prisma/client'

const materialSchema = z.object({
  title: z.string().min(2),
  type: z.nativeEnum(MaterialType),
  area: z.string().optional(),
  discipline: z.string().optional(),
  author: z.string().optional(),
  url: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
})

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, type, area } = req.query
    const materials = await prisma.studyMaterial.findMany({
      where: {
        ...(type ? { type: type as MaterialType } : {}),
        ...(area ? { area: { contains: area as string, mode: 'insensitive' } } : {}),
        ...(q ? {
          OR: [
            { title: { contains: q as string, mode: 'insensitive' } },
            { author: { contains: q as string, mode: 'insensitive' } },
            { discipline: { contains: q as string, mode: 'insensitive' } },
            { tags: { has: q as string } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, displayName: true } } },
    })
    res.json({ materials })
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requireRole('MODERATOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = materialSchema.parse(req.body)
    const material = await prisma.studyMaterial.create({ data: { ...data, createdById: req.user!.sub } })
    res.status(201).json({ material })
  } catch (err) { next(err) }
})

router.put('/:id', requireAuth, requireRole('MODERATOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = materialSchema.partial().parse(req.body)
    const material = await prisma.studyMaterial.update({ where: { id: req.params['id'] }, data })
    res.json({ material })
  } catch (err) { next(err) }
})

export default router
