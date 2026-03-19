"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const absenceSchema = zod_1.z.object({
    disciplineName: zod_1.z.string().min(1),
    totalClasses: zod_1.z.number().int().min(0),
    absences: zod_1.z.number().int().min(0),
});
const service = {
    async getAll(userId) {
        return prisma_1.prisma.userAbsence.findMany({
            where: { userId },
            orderBy: { disciplineCode: 'asc' },
        });
    },
    async upsert(userId, disciplineCode, data) {
        return prisma_1.prisma.userAbsence.upsert({
            where: { userId_disciplineCode: { userId, disciplineCode } },
            create: { userId, disciplineCode, ...data },
            update: data,
        });
    },
    async delete(userId, disciplineCode) {
        await prisma_1.prisma.userAbsence.deleteMany({ where: { userId, disciplineCode } });
    },
};
router.use(auth_1.requireAuth);
router.get('/', async (req, res, next) => {
    try {
        const absences = await service.getAll(req.user.sub);
        res.json({ absences });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:code', async (req, res, next) => {
    try {
        const data = absenceSchema.parse(req.body);
        const abs = await service.upsert(req.user.sub, req.params['code'], data);
        res.json({ absence: abs });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:code', async (req, res, next) => {
    try {
        await service.delete(req.user.sub, req.params['code']);
        res.json({ message: 'Disciplina removida' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=faltas.js.map