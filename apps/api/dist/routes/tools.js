"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middlewares/auth");
const toolKeySchema = zod_1.z.enum(['notes', 'flashcards', 'checklist']);
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/tools/:key  — busca dados de uma ferramenta
router.get('/:key', async (req, res, next) => {
    try {
        const key = toolKeySchema.parse(req.params['key']);
        const record = await prisma_1.prisma.toolData.findUnique({
            where: { userId_toolKey: { userId: req.user.sub, toolKey: key } },
        });
        res.json({ data: record?.data ?? null });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/tools/:key  — salva/atualiza dados de uma ferramenta
router.put('/:key', async (req, res, next) => {
    try {
        const key = toolKeySchema.parse(req.params['key']);
        const record = await prisma_1.prisma.toolData.upsert({
            where: { userId_toolKey: { userId: req.user.sub, toolKey: key } },
            create: { userId: req.user.sub, toolKey: key, data: req.body },
            update: { data: req.body },
        });
        res.json({ data: record.data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=tools.js.map