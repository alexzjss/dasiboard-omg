"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const entidadeSchema = zod_1.z.object({
    slug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/),
    name: zod_1.z.string().min(2),
    fullName: zod_1.z.string().optional(),
    type: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    colorPrimary: zod_1.z.string().optional(),
    colorSecondary: zod_1.z.string().optional(),
    emoji: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    links: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), url: zod_1.z.string(), icon: zod_1.z.string().optional() })).default([]),
    active: zod_1.z.boolean().default(true),
});
router.get('/', async (_req, res, next) => {
    try {
        const entidades = await prisma_1.prisma.entidade.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
        res.json({ entidades });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const entidade = await prisma_1.prisma.entidade.findFirst({
            where: { OR: [{ id: req.params['id'] }, { slug: req.params['id'] }] },
            include: {
                events: { where: { status: 'published' }, orderBy: { date: 'asc' } },
                newsletterIssues: { orderBy: { publishedAt: 'desc' }, take: 5 },
            },
        });
        if (!entidade)
            return res.status(404).json({ error: 'Entidade não encontrada' });
        res.json({ entidade });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = entidadeSchema.parse(req.body);
        const entidade = await prisma_1.prisma.entidade.create({ data });
        res.status(201).json({ entidade });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = entidadeSchema.partial().parse(req.body);
        const entidade = await prisma_1.prisma.entidade.update({ where: { id: req.params['id'] }, data });
        res.json({ entidade });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=entidades.js.map