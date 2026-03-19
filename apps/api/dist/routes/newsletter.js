"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================================
// newsletter.ts
// ============================================================
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const issueSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    summary: zod_1.z.string().min(2),
    content: zod_1.z.string().min(10),
    entidadeId: zod_1.z.string().uuid().optional(),
    publishedAt: zod_1.z.string().datetime().optional(),
});
router.get('/', async (req, res, next) => {
    try {
        const { entidadeId } = req.query;
        const issues = await prisma_1.prisma.newsletterIssue.findMany({
            where: entidadeId ? { entidadeId: entidadeId } : {},
            orderBy: { publishedAt: 'desc' },
            include: { entidade: { select: { id: true, name: true, slug: true, emoji: true } } },
        });
        res.json({ issues });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const issue = await prisma_1.prisma.newsletterIssue.findUnique({
            where: { id: req.params['id'] },
            include: { entidade: true, createdBy: { select: { id: true, displayName: true } } },
        });
        if (!issue)
            return res.status(404).json({ error: 'Newsletter não encontrada' });
        res.json({ issue });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), async (req, res, next) => {
    try {
        const data = issueSchema.parse(req.body);
        const issue = await prisma_1.prisma.newsletterIssue.create({
            data: { ...data, createdById: req.user.sub, publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date() },
        });
        res.status(201).json({ issue });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), async (req, res, next) => {
    try {
        const data = issueSchema.partial().parse(req.body);
        const issue = await prisma_1.prisma.newsletterIssue.update({ where: { id: req.params['id'] }, data });
        res.json({ issue });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=newsletter.js.map