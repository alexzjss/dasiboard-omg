"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const slotSchema = zod_1.z.object({
    turmaCode: zod_1.z.string(),
    semester: zod_1.z.number().int(),
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    timeStart: zod_1.z.string().regex(/^\d{2}:\d{2}$/),
    timeEnd: zod_1.z.string().regex(/^\d{2}:\d{2}$/),
    courseName: zod_1.z.string(),
    courseCode: zod_1.z.string().optional(),
    room: zod_1.z.string().optional(),
    professor: zod_1.z.string().optional(),
    jupiterUrl: zod_1.z.string().url().optional(),
});
router.get('/', async (_req, res, next) => {
    try {
        const slots = await prisma_1.prisma.scheduleSlot.findMany({ orderBy: [{ turmaCode: 'asc' }, { dayOfWeek: 'asc' }, { timeStart: 'asc' }] });
        // Agrupa por turma
        const grouped = {};
        for (const s of slots) {
            if (!grouped[s.turmaCode])
                grouped[s.turmaCode] = [];
            grouped[s.turmaCode].push(s);
        }
        res.json({ schedule: grouped });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:turmaCode', async (req, res, next) => {
    try {
        const slots = await prisma_1.prisma.scheduleSlot.findMany({
            where: { turmaCode: req.params['turmaCode'] },
            orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
        });
        res.json({ slots });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = slotSchema.parse(req.body);
        const slot = await prisma_1.prisma.scheduleSlot.create({ data });
        res.status(201).json({ slot });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = slotSchema.partial().parse(req.body);
        const slot = await prisma_1.prisma.scheduleSlot.update({ where: { id: req.params['id'] }, data });
        res.json({ slot });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        await prisma_1.prisma.scheduleSlot.delete({ where: { id: req.params['id'] } });
        res.json({ message: 'Slot removido' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=schedule.js.map