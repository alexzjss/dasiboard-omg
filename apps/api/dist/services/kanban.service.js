"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kanbanService = void 0;
const prisma_1 = require("../utils/prisma");
exports.kanbanService = {
    /** Retorna todas as cards do usuário organizadas por coluna */
    async getBoard(userId) {
        const cards = await prisma_1.prisma.kanbanCard.findMany({
            where: { userId },
            orderBy: [{ column: 'asc' }, { position: 'asc' }],
        });
        return {
            todo: cards.filter((c) => c.column === 'todo'),
            doing: cards.filter((c) => c.column === 'doing'),
            done: cards.filter((c) => c.column === 'done'),
        };
    },
    async createCard(userId, data) {
        // Coloca a nova card no final da coluna
        const lastCard = await prisma_1.prisma.kanbanCard.findFirst({
            where: { userId, column: data.column },
            orderBy: { position: 'desc' },
        });
        const position = lastCard ? lastCard.position + 1 : 0;
        return prisma_1.prisma.kanbanCard.create({
            data: { userId, position, ...data },
        });
    },
    async updateCard(userId, cardId, data) {
        return prisma_1.prisma.kanbanCard.updateMany({
            where: { id: cardId, userId }, // garante que só o dono edita
            data,
        });
    },
    async deleteCard(userId, cardId) {
        await prisma_1.prisma.kanbanCard.deleteMany({
            where: { id: cardId, userId },
        });
    },
    /**
     * Reordena cards após arrastar-e-soltar.
     * Recebe um array com a nova ordem de cada coluna.
     */
    async reorder(userId, columns) {
        const updates = [];
        for (const [col, ids] of Object.entries(columns)) {
            ids.forEach((id, position) => {
                updates.push(prisma_1.prisma.kanbanCard.updateMany({
                    where: { id, userId },
                    data: { column: col, position },
                }));
            });
        }
        await prisma_1.prisma.$transaction(updates);
    },
    async clearDone(userId) {
        await prisma_1.prisma.kanbanCard.deleteMany({
            where: { userId, column: 'done' },
        });
    },
};
//# sourceMappingURL=kanban.service.js.map