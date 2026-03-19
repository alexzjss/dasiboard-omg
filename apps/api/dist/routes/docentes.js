"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const docenteSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    title: zod_1.z.string().optional(),
    area: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    photoUrl: zod_1.z.string().url().optional(),
    lattes: zod_1.z.string().url().optional(),
    site: zod_1.z.string().url().optional(),
    active: zod_1.z.boolean().default(true),
});
router.get('/', async (req, res, next) => {
    try {
        const { q } = req.query;
        const docentes = await prisma_1.prisma.docente.findMany({
            where: {
                active: true,
                ...(q ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { area: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            orderBy: { name: 'asc' },
        });
        res.json({ docentes });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const docente = await prisma_1.prisma.docente.findUnique({ where: { id: req.params['id'] } });
        if (!docente)
            return res.status(404).json({ error: 'Docente não encontrado' });
        res.json({ docente });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = docenteSchema.parse(req.body);
        const docente = await prisma_1.prisma.docente.create({ data });
        res.status(201).json({ docente });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = docenteSchema.partial().parse(req.body);
        const docente = await prisma_1.prisma.docente.update({ where: { id: req.params['id'] }, data });
        res.json({ docente });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=docentes.js.map