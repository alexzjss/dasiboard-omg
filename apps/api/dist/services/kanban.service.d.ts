import { KanbanColumn, KanbanTag } from '../utils/enums';
export declare const kanbanService: {
    /** Retorna todas as cards do usuário organizadas por coluna */
    getBoard(userId: string): Promise<{
        todo: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            userId: string;
            column: import("@prisma/client").$Enums.KanbanColumn;
            tag: import("@prisma/client").$Enums.KanbanTag | null;
            dueDate: Date | null;
            position: number;
        }[];
        doing: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            userId: string;
            column: import("@prisma/client").$Enums.KanbanColumn;
            tag: import("@prisma/client").$Enums.KanbanTag | null;
            dueDate: Date | null;
            position: number;
        }[];
        done: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            userId: string;
            column: import("@prisma/client").$Enums.KanbanColumn;
            tag: import("@prisma/client").$Enums.KanbanTag | null;
            dueDate: Date | null;
            position: number;
        }[];
    }>;
    createCard(userId: string, data: {
        title: string;
        description?: string;
        column: KanbanColumn;
        tag?: KanbanTag;
        dueDate?: Date;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        userId: string;
        column: import("@prisma/client").$Enums.KanbanColumn;
        tag: import("@prisma/client").$Enums.KanbanTag | null;
        dueDate: Date | null;
        position: number;
    }>;
    updateCard(userId: string, cardId: string, data: Partial<{
        title: string;
        description: string;
        column: KanbanColumn;
        tag: KanbanTag | null;
        dueDate: Date | null;
    }>): Promise<import("@prisma/client").Prisma.BatchPayload>;
    deleteCard(userId: string, cardId: string): Promise<void>;
    /**
     * Reordena cards após arrastar-e-soltar.
     * Recebe um array com a nova ordem de cada coluna.
     */
    reorder(userId: string, columns: {
        todo: string[];
        doing: string[];
        done: string[];
    }): Promise<void>;
    clearDone(userId: string): Promise<void>;
};
//# sourceMappingURL=kanban.service.d.ts.map