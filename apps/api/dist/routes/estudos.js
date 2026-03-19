"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const enums_1 = require("../utils/enums");
const router = (0, express_1.Router)();
const materialSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    type: zod_1.z.nativeEnum(enums_1.MaterialType),
    area: zod_1.z.string().optional(),
    discipline: zod_1.z.string().optional(),
    author: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    fileUrl: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
router.get('/', async (req, res, next) => {
    try {
        const { q, type, area } = req.query;
        const materials = await prisma_1.prisma.studyMaterial.findMany({
            where: {
                ...(type ? { type: type } : {}),
                ...(area ? { area: { contains: area, mode: 'insensitive' } } : {}),
                ...(q ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { author: { contains: q, mode: 'insensitive' } },
                        { discipline: { contains: q, mode: 'insensitive' } },
                        { tags: { has: q } },
                    ],
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, displayName: true } } },
        });
        res.json({ materials });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), async (req, res, next) => {
    try {
        const data = materialSchema.parse(req.body);
        const material = await prisma_1.prisma.studyMaterial.create({ data: { ...data, createdById: req.user.sub } });
        res.status(201).json({ material });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), async (req, res, next) => {
    try {
        const data = materialSchema.partial().parse(req.body);
        const material = await prisma_1.prisma.studyMaterial.update({ where: { id: req.params['id'] }, data });
        res.json({ material });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=estudos.js.map