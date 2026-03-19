"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsService = void 0;
const prisma_1 = require("../utils/prisma");
const errors_1 = require("../utils/errors");
exports.eventsService = {
    async list(filters = {}) {
        const where = {};
        if (filters.status) {
            where.status = filters.status;
        }
        else {
            where.status = 'published';
        }
        if (filters.turma) {
            where.OR = [
                { turmas: { has: filters.turma } },
                { turmas: { isEmpty: true } }, // eventos sem turma específica = todos
            ];
        }
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.month && filters.year) {
            const start = new Date(filters.year, filters.month - 1, 1);
            const end = new Date(filters.year, filters.month, 0);
            where.date = { gte: start, lte: end };
        }
        return prisma_1.prisma.event.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                entidade: { select: { id: true, name: true, slug: true, emoji: true, colorPrimary: true } },
                createdBy: { select: { id: true, displayName: true } },
            },
        });
    },
    async getById(id) {
        const event = await prisma_1.prisma.event.findUnique({
            where: { id },
            include: {
                entidade: { select: { id: true, name: true, slug: true, emoji: true } },
                createdBy: { select: { id: true, displayName: true } },
            },
        });
        if (!event)
            throw errors_1.Errors.notFound('Evento');
        return event;
    },
    async create(data) {
        return prisma_1.prisma.event.create({ data });
    },
    async update(id, data) {
        await exports.eventsService.getById(id);
        return prisma_1.prisma.event.update({ where: { id }, data });
    },
    async delete(id) {
        await exports.eventsService.getById(id);
        await prisma_1.prisma.event.delete({ where: { id } });
    },
    async listPending() {
        return prisma_1.prisma.event.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
            include: { createdBy: { select: { id: true, displayName: true, email: true } } },
        });
    },
    async approve(id) {
        return prisma_1.prisma.event.update({
            where: { id },
            data: { status: 'published' },
        });
    },
    async reject(id) {
        return prisma_1.prisma.event.update({
            where: { id },
            data: { status: 'rejected' },
        });
    },
};
//# sourceMappingURL=events.service.js.map