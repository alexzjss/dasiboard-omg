import { KanbanColumn, KanbanTag } from '../utils/enums'
import { prisma } from '../utils/prisma'

export const kanbanService = {
  /** Retorna todas as cards do usuário organizadas por coluna */
  async getBoard(userId: string) {
    const cards = await prisma.kanbanCard.findMany({
      where: { userId },
      orderBy: [{ column: 'asc' }, { position: 'asc' }],
    })

    return {
      todo: cards.filter((c: { column: string; [key: string]: unknown }) => c.column === 'todo'),
      doing: cards.filter((c: { column: string; [key: string]: unknown }) => c.column === 'doing'),
      done: cards.filter((c: { column: string; [key: string]: unknown }) => c.column === 'done'),
    }
  },

  async createCard(userId: string, data: {
    title: string
    description?: string
    column: KanbanColumn
    tag?: KanbanTag
    dueDate?: Date
  }) {
    // Coloca a nova card no final da coluna
    const lastCard = await prisma.kanbanCard.findFirst({
      where: { userId, column: data.column },
      orderBy: { position: 'desc' },
    })
    const position = lastCard ? lastCard.position + 1 : 0

    return prisma.kanbanCard.create({
      data: { userId, position, ...data },
    })
  },

  async updateCard(userId: string, cardId: string, data: Partial<{
    title: string
    description: string
    column: KanbanColumn
    tag: KanbanTag | null
    dueDate: Date | null
  }>) {
    return prisma.kanbanCard.updateMany({
      where: { id: cardId, userId }, // garante que só o dono edita
      data,
    })
  },

  async deleteCard(userId: string, cardId: string) {
    await prisma.kanbanCard.deleteMany({
      where: { id: cardId, userId },
    })
  },

  /**
   * Reordena cards após arrastar-e-soltar.
   * Recebe um array com a nova ordem de cada coluna.
   */
  async reorder(userId: string, columns: {
    todo: string[]
    doing: string[]
    done: string[]
  }) {
    const updates: Promise<unknown>[] = []

    for (const [col, ids] of Object.entries(columns) as [KanbanColumn, string[]][]) {
      ids.forEach((id, position) => {
        updates.push(
          prisma.kanbanCard.updateMany({
            where: { id, userId },
            data: { column: col, position },
          })
        )
      })
    }

    await prisma.$transaction(updates as any)
  },

  async clearDone(userId: string) {
    await prisma.kanbanCard.deleteMany({
      where: { userId, column: 'done' },
    })
  },
}
