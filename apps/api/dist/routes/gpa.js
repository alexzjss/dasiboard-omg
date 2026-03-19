"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const library_1 = require("@prisma/client/runtime/library");
// ─── Service ──────────────────────────────────────────────────────────────────
const router = (0, express_1.Router)();
const gpaService = {
    async getGrades(userId) {
        return prisma_1.prisma.userGrade.findMany({
            where: { userId },
            orderBy: [{ semester: 'asc' }, { disciplineId: 'asc' }],
        });
    },
    async upsertGrade(userId, disciplineId, data) {
        return prisma_1.prisma.userGrade.upsert({
            where: { userId_disciplineId: { userId, disciplineId } },
            create: { userId, disciplineId, ...data, grade: data.grade != null ? new library_1.Decimal(data.grade) : null },
            update: { grade: data.grade != null ? new library_1.Decimal(data.grade) : null, credits: data.credits },
        });
    },
    async bulkUpsert(userId, grades) {
        const ops = grades.map((g) => prisma_1.prisma.userGrade.upsert({
            where: { userId_disciplineId: { userId, disciplineId: g.disciplineId } },
            create: { userId, ...g, grade: g.grade != null ? new library_1.Decimal(g.grade) : null },
            update: { grade: g.grade != null ? new library_1.Decimal(g.grade) : null },
        }));
        return prisma_1.prisma.$transaction(ops);
    },
    calcGPA(grades) {
        const graded = grades.filter((g) => g.grade != null);
        if (!graded.length)
            return null;
        const totalCredits = graded.reduce((s, g) => s + g.credits, 0);
        const weighted = graded.reduce((s, g) => s + Number(g.grade) * g.credits, 0);
        return Math.round((weighted / totalCredits) * 100) / 100;
    },
};
// ─── Controller ───────────────────────────────────────────────────────────────
const gradeSchema = zod_1.z.object({
    grade: zod_1.z.number().min(0).max(10).nullable(),
    credits: zod_1.z.number().int().min(1).max(12).default(4),
    semester: zod_1.z.number().int().min(1).max(10),
});
const bulkSchema = zod_1.z.object({
    grades: zod_1.z.array(zod_1.z.object({
        disciplineId: zod_1.z.string(),
        grade: zod_1.z.number().min(0).max(10).nullable(),
        credits: zod_1.z.number().int().min(1).default(4),
        semester: zod_1.z.number().int().min(1),
    })),
});
const controller = {
    async getGrades(req, res, next) {
        try {
            const grades = await gpaService.getGrades(req.user.sub);
            const gpa = gpaService.calcGPA(grades);
            res.json({ grades, gpa });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertGrade(req, res, next) {
        try {
            const data = gradeSchema.parse(req.body);
            const grade = await gpaService.upsertGrade(req.user.sub, req.params['disciplineId'], data);
            res.json({ grade });
        }
        catch (err) {
            next(err);
        }
    },
    async bulkUpsert(req, res, next) {
        try {
            const { grades } = bulkSchema.parse(req.body);
            await gpaService.bulkUpsert(req.user.sub, grades);
            const all = await gpaService.getGrades(req.user.sub);
            res.json({ grades: all, gpa: gpaService.calcGPA(all) });
        }
        catch (err) {
            next(err);
        }
    },
};
// ─── Routes ───────────────────────────────────────────────────────────────────
router.use(auth_1.requireAuth);
router.get('/', controller.getGrades);
router.put('/bulk', controller.bulkUpsert);
router.put('/:disciplineId', controller.upsertGrade);
exports.default = router;
//# sourceMappingURL=gpa.js.map