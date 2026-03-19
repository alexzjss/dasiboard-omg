import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole } from '../middlewares/auth'

const docenteSchema = z.object({
  name: z.string().min(2),
  title: z.string().optional(),
  area: z.string().optional(),
  email: z.string().email().optional(),
  photoUrl: z.string().url().optional(),
  lattes: z.string().url().optional(),
  site: z.string().url().optional(),
  active: z.boolean().default(true),
})

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query
    const docentes = await prisma.docente.findMany({
      where: {
        active: true,
        ...(q ? {
          OR: [
            { name: { contains: q as string, mode: 'insensitive' } },
            { area: { contains: q as string, mode: 'insensitive' } },
            { email: { contains: q as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { name: 'asc' },
    })
    res.json({ docentes })
  } catch (err) { next(err) }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docente = await prisma.docente.findUnique({ where: { id: req.params['id'] } })
    if (!docente) return res.status(404).json({ error: 'Docente não encontrado' })
    res.json({ docente })
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = docenteSchema.parse(req.body)
    const docente = await prisma.docente.create({ data })
    res.status(201).json({ docente })
  } catch (err) { next(err) }
})

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = docenteSchema.partial().parse(req.body)
    const docente = await prisma.docente.update({ where: { id: req.params['id'] }, data })
    res.json({ docente })
  } catch (err) { next(err) }
})

export default router
