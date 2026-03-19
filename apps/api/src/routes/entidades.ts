import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole } from '../middlewares/auth'

const entidadeSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  fullName: z.string().optional(),
  type: z.string(),
  description: z.string().optional(),
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  emoji: z.string().optional(),
  email: z.string().email().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string(), icon: z.string().optional() })).default([]),
  active: z.boolean().default(true),
})

const router = Router()

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entidades = await prisma.entidade.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    res.json({ entidades })
  } catch (err) { next(err) }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entidade = await prisma.entidade.findFirst({
      where: { OR: [{ id: req.params['id'] }, { slug: req.params['id'] }] },
      include: {
        events: { where: { status: 'published' }, orderBy: { date: 'asc' } },
        newsletterIssues: { orderBy: { publishedAt: 'desc' }, take: 5 },
      },
    })
    if (!entidade) return res.status(404).json({ error: 'Entidade não encontrada' })
    res.json({ entidade })
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = entidadeSchema.parse(req.body)
    const entidade = await prisma.entidade.create({ data })
    res.status(201).json({ entidade })
  } catch (err) { next(err) }
})

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = entidadeSchema.partial().parse(req.body)
    const entidade = await prisma.entidade.update({ where: { id: req.params['id'] }, data })
    res.json({ entidade })
  } catch (err) { next(err) }
})

export default router
