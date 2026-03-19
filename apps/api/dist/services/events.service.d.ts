import { EventStatus, EventType } from '../utils/enums';
export interface EventFilters {
    turma?: string;
    type?: EventType;
    status?: EventStatus;
    month?: number;
    year?: number;
}
export declare const eventsService: {
    list(filters?: EventFilters): Promise<({
        entidade: {
            id: string;
            name: string;
            slug: string;
            colorPrimary: string | null;
            emoji: string | null;
        } | null;
        createdBy: {
            id: string;
            displayName: string | null;
        } | null;
    } & {
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    })[]>;
    getById(id: string): Promise<{
        entidade: {
            id: string;
            name: string;
            slug: string;
            emoji: string | null;
        } | null;
        createdBy: {
            id: string;
            displayName: string | null;
        } | null;
    } & {
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    }>;
    create(data: {
        title: string;
        description?: string;
        date: Date;
        type: EventType;
        turmas?: string[];
        entidadeId?: string;
        createdById?: string;
        status?: EventStatus;
    }): Promise<{
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    }>;
    update(id: string, data: Partial<{
        title: string;
        description: string;
        date: Date;
        type: EventType;
        turmas: string[];
        entidadeId: string;
        status: EventStatus;
    }>): Promise<{
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    }>;
    delete(id: string): Promise<void>;
    listPending(): Promise<({
        createdBy: {
            id: string;
            email: string;
            displayName: string | null;
        } | null;
    } & {
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    })[]>;
    approve(id: string): Promise<{
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    }>;
    reject(id: string): Promise<{
        type: import("@prisma/client").$Enums.EventType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EventStatus;
        title: string;
        description: string | null;
        date: Date;
        turmas: string[];
        entidadeId: string | null;
        createdById: string | null;
    }>;
};
//# sourceMappingURL=events.service.d.ts.map