"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const kanban_service_1 = require("../services/kanban.service");
const auth_1 = require("../middlewares/auth");
const enums_1 = require("../utils/enums");
const router = (0, express_1.Router)();
// ─── Schemas ──────────────────────────────────────────────────────────────────
const createCardSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().max(500).optional(),
    column: zod_1.z.nativeEnum(enums_1.KanbanColumn).default(enums_1.KanbanColumn.todo),
    tag: zod_1.z.nativeEnum(enums_1.KanbanTag).optional(),
    dueDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const updateCardSchema = createCardSchema.partial().extend({
    tag: zod_1.z.nativeEnum(enums_1.KanbanTag).nullable().optional(),
    dueDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const reorderSchema = zod_1.z.object({
    todo: zod_1.z.array(zod_1.z.string()),
    doing: zod_1.z.array(zod_1.z.string()),
    done: zod_1.z.array(zod_1.z.string()),
});
// ─── Controller ───────────────────────────────────────────────────────────────
const controller = {
    async getBoard(req, res, next) {
        try {
            const board = await kanban_service_1.kanbanService.getBoard(req.user.sub);
            res.json({ board });
        }
        catch (err) {
            next(err);
        }
    },
    async createCard(req, res, next) {
        try {
            const data = createCardSchema.parse(req.body);
            const card = await kanban_service_1.kanbanService.createCard(req.user.sub, {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            });
            res.status(201).json({ card });
        }
        catch (err) {
            next(err);
        }
    },
    async updateCard(req, res, next) {
        try {
            const data = updateCardSchema.parse(req.body);
            await kanban_service_1.kanbanService.updateCard(req.user.sub, req.params['id'], {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
            });
            res.json({ message: 'Card atualizado' });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteCard(req, res, next) {
        try {
            await kanban_service_1.kanbanService.deleteCard(req.user.sub, req.params['id']);
            res.json({ message: 'Card removido' });
        }
        catch (err) {
            next(err);
        }
    },
    async reorder(req, res, next) {
        try {
            const columns = reorderSchema.parse(req.body);
            await kanban_service_1.kanbanService.reorder(req.user.sub, columns);
            res.json({ message: 'Quadro reordenado' });
        }
        catch (err) {
            next(err);
        }
    },
    async clearDone(req, res, next) {
        try {
            await kanban_service_1.kanbanService.clearDone(req.user.sub);
            res.json({ message: 'Cards concluídos removidos' });
        }
        catch (err) {
            next(err);
        }
    },
};
// ─── Routes ───────────────────────────────────────────────────────────────────
router.use(auth_1.requireAuth); // todas as rotas do kanban exigem auth
router.get('/', controller.getBoard);
router.post('/', controller.createCard);
router.put('/reorder', controller.reorder);
router.delete('/done', controller.clearDone);
router.put('/:id', controller.updateCard);
router.delete('/:id', controller.deleteCard);
exports.default = router;
//# sourceMappingURL=kanban.js.map