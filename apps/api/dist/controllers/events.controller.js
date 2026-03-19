"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsController = void 0;
const zod_1 = require("zod");
const events_service_1 = require("../services/events.service");
const enums_1 = require("../utils/enums");
const eventSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(120),
    description: zod_1.z.string().max(500).optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
    type: zod_1.z.nativeEnum(enums_1.EventType),
    turmas: zod_1.z.array(zod_1.z.string()).optional().default([]),
    entidadeId: zod_1.z.string().uuid().optional(),
});
exports.eventsController = {
    async list(req, res, next) {
        try {
            const { turma, type, month, year } = req.query;
            const events = await events_service_1.eventsService.list({
                turma: turma,
                type: type,
                month: month ? parseInt(month) : undefined,
                year: year ? parseInt(year) : undefined,
            });
            res.json({ events });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const event = await events_service_1.eventsService.getById(req.params['id']);
            res.json({ event });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = eventSchema.parse(req.body);
            const event = await events_service_1.eventsService.create({
                ...data,
                date: new Date(data.date),
                createdById: req.user?.sub,
                status: enums_1.EventStatus.published, // admin cria direto como publicado
            });
            res.status(201).json({ event });
        }
        catch (err) {
            next(err);
        }
    },
    async submitPending(req, res, next) {
        try {
            const data = eventSchema.parse(req.body);
            const event = await events_service_1.eventsService.create({
                ...data,
                date: new Date(data.date),
                createdById: req.user?.sub,
                status: enums_1.EventStatus.pending, // usuário comum: aguarda aprovação
            });
            res.status(201).json({ event, message: 'Evento enviado para aprovação' });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = eventSchema.partial().parse(req.body);
            const event = await events_service_1.eventsService.update(req.params['id'], {
                ...data,
                date: data.date ? new Date(data.date) : undefined,
            });
            res.json({ event });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await events_service_1.eventsService.delete(req.params['id']);
            res.json({ message: 'Evento removido' });
        }
        catch (err) {
            next(err);
        }
    },
    async listPending(req, res, next) {
        try {
            const events = await events_service_1.eventsService.listPending();
            res.json({ events });
        }
        catch (err) {
            next(err);
        }
    },
    async approve(req, res, next) {
        try {
            const event = await events_service_1.eventsService.approve(req.params['id']);
            res.json({ event });
        }
        catch (err) {
            next(err);
        }
    },
    async reject(req, res, next) {
        try {
            const event = await events_service_1.eventsService.reject(req.params['id']);
            res.json({ event });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=events.controller.js.map