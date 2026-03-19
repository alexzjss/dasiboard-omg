// ============================================================
// newsletter.ts
// ============================================================
import { Router, Request, Response, NextFunction } from 'express'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole } from '../middlewares/auth'

const router: ExpressRouter = Router()

const issueSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(2),
  content: z.string().min(10),
  entidadeId: z.string().uuid().optional(),
  publishedAt: z.string().datetime().optional(),
})

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entidadeId } = req.query
    const issues = await prisma.newsletterIssue.findMany({
      where: entidadeId ? { entidadeId: entidadeId as string } : {},
      orderBy: { publishedAt: 'desc' },
      include: { entidade: { select: { id: true, name: true, slug: true, emoji: true } } },
    })
    res.json({ issues })
  } catch (err) { next(err) }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await prisma.newsletterIssue.findUnique({
      where: { id: req.params['id'] },
      include: { entidade: true, createdBy: { select: { id: true, displayName: true } } },
    })
    if (!issue) return res.status(404).json({ error: 'Newsletter não encontrada' })
    res.json({ issue })
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requireRole('MODERATOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = issueSchema.parse(req.body)
    const issue = await prisma.newsletterIssue.create({
      data: { ...data, createdById: req.user!.sub, publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date() },
    })
    res.status(201).json({ issue })
  } catch (err) { next(err) }
})

router.put('/:id', requireAuth, requireRole('MODERATOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = issueSchema.partial().parse(req.body)
    const issue = await prisma.newsletterIssue.update({ where: { id: req.params['id'] }, data })
    res.json({ issue })
  } catch (err) { next(err) }
})

export default router
