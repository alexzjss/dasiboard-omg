import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole } from '../middlewares/auth'

const slotSchema = z.object({
  turmaCode: z.string(),
  semester: z.number().int(),
  dayOfWeek: z.number().int().min(0).max(6),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/),
  courseName: z.string(),
  courseCode: z.string().optional(),
  room: z.string().optional(),
  professor: z.string().optional(),
  jupiterUrl: z.string().url().optional(),
})

const router = Router()

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await prisma.scheduleSlot.findMany({ orderBy: [{ turmaCode: 'asc' }, { dayOfWeek: 'asc' }, { timeStart: 'asc' }] })
    // Agrupa por turma
    const grouped: Record<string, typeof slots> = {}
    for (const s of slots) {
      if (!grouped[s.turmaCode]) grouped[s.turmaCode] = []
      grouped[s.turmaCode]!.push(s)
    }
    res.json({ schedule: grouped })
  } catch (err) { next(err) }
})

router.get('/:turmaCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await prisma.scheduleSlot.findMany({
      where: { turmaCode: req.params['turmaCode'] },
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
    })
    res.json({ slots })
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = slotSchema.parse(req.body)
    const slot = await prisma.scheduleSlot.create({ data })
    res.status(201).json({ slot })
  } catch (err) { next(err) }
})

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = slotSchema.partial().parse(req.body)
    const slot = await prisma.scheduleSlot.update({ where: { id: req.params['id'] }, data })
    res.json({ slot })
  } catch (err) { next(err) }
})

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.scheduleSlot.delete({ where: { id: req.params['id'] } })
    res.json({ message: 'Slot removido' })
  } catch (err) { next(err) }
})

export default router
