import { Router, Request, Response, NextFunction } from 'express'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../middlewares/auth'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Service ──────────────────────────────────────────────────────────────────

const router: ExpressRouter = Router()

const gpaService = {
  async getGrades(userId: string) {
    return prisma.userGrade.findMany({
      where: { userId },
      orderBy: [{ semester: 'asc' }, { disciplineId: 'asc' }],
    })
  },

  async upsertGrade(userId: string, disciplineId: string, data: {
    grade: number | null
    credits: number
    semester: number
  }) {
    return prisma.userGrade.upsert({
      where: { userId_disciplineId: { userId, disciplineId } },
      create: { userId, disciplineId, ...data, grade: data.grade != null ? new Decimal(data.grade) : null },
      update: { grade: data.grade != null ? new Decimal(data.grade) : null, credits: data.credits },
    })
  },

  async bulkUpsert(userId: string, grades: { disciplineId: string; grade: number | null; credits: number; semester: number }[]) {
    const ops = grades.map((g) =>
      prisma.userGrade.upsert({
        where: { userId_disciplineId: { userId, disciplineId: g.disciplineId } },
        create: { userId, ...g, grade: g.grade != null ? new Decimal(g.grade) : null },
        update: { grade: g.grade != null ? new Decimal(g.grade) : null },
      })
    )
    return prisma.$transaction(ops)
  },

  calcGPA(grades: { grade: Decimal | null; credits: number }[]): number | null {
    const graded = grades.filter((g) => g.grade != null)
    if (!graded.length) return null
    const totalCredits = graded.reduce((s, g) => s + g.credits, 0)
    const weighted = graded.reduce((s, g) => s + Number(g.grade) * g.credits, 0)
    return Math.round((weighted / totalCredits) * 100) / 100
  },
}

// ─── Controller ───────────────────────────────────────────────────────────────

const gradeSchema = z.object({
  grade: z.number().min(0).max(10).nullable(),
  credits: z.number().int().min(1).max(12).default(4),
  semester: z.number().int().min(1).max(10),
})

const bulkSchema = z.object({
  grades: z.array(z.object({
    disciplineId: z.string(),
    grade: z.number().min(0).max(10).nullable(),
    credits: z.number().int().min(1).default(4),
    semester: z.number().int().min(1),
  })),
})

const controller = {
  async getGrades(req: Request, res: Response, next: NextFunction) {
    try {
      const grades = await gpaService.getGrades(req.user!.sub)
      const gpa = gpaService.calcGPA(grades)
      res.json({ grades, gpa })
    } catch (err) { next(err) }
  },

  async upsertGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const data = gradeSchema.parse(req.body)
      const grade = await gpaService.upsertGrade(req.user!.sub, req.params['disciplineId']!, data)
      res.json({ grade })
    } catch (err) { next(err) }
  },

  async bulkUpsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { grades } = bulkSchema.parse(req.body)
      await gpaService.bulkUpsert(req.user!.sub, grades)
      const all = await gpaService.getGrades(req.user!.sub)
      res.json({ grades: all, gpa: gpaService.calcGPA(all) })
    } catch (err) { next(err) }
  },
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.use(requireAuth)

router.get('/', controller.getGrades)
router.put('/bulk', controller.bulkUpsert)
router.put('/:disciplineId', controller.upsertGrade)

export default router
