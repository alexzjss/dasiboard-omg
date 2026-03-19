import { EventStatus, EventType } from '../utils/enums'
import { prisma } from '../utils/prisma'
import { Errors } from '../utils/errors'

export interface EventFilters {
  turma?: string
  type?: EventType
  status?: EventStatus
  month?: number   // 1-12
  year?: number
}

export const eventsService = {
  async list(filters: EventFilters = {}) {
    const where: Record<string, unknown> = {}

    if (filters.status) {
      where.status = filters.status
    } else {
      where.status = 'published'
    }

    if (filters.turma) {
      where.OR = [
        { turmas: { has: filters.turma } },
        { turmas: { isEmpty: true } },   // eventos sem turma específica = todos
      ]
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.month && filters.year) {
      const start = new Date(filters.year, filters.month - 1, 1)
      const end = new Date(filters.year, filters.month, 0)
      where.date = { gte: start, lte: end }
    }

    return prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        entidade: { select: { id: true, name: true, slug: true, emoji: true, colorPrimary: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    })
  },

  async getById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        entidade: { select: { id: true, name: true, slug: true, emoji: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    })
    if (!event) throw Errors.notFound('Evento')
    return event
  },

  async create(data: {
    title: string
    description?: string
    date: Date
    type: EventType
    turmas?: string[]
    entidadeId?: string
    createdById?: string
    status?: EventStatus
  }) {
    return prisma.event.create({ data })
  },

  async update(id: string, data: Partial<{
    title: string
    description: string
    date: Date
    type: EventType
    turmas: string[]
    entidadeId: string
    status: EventStatus
  }>) {
    await eventsService.getById(id)
    return prisma.event.update({ where: { id }, data })
  },

  async delete(id: string) {
    await eventsService.getById(id)
    await prisma.event.delete({ where: { id } })
  },

  async listPending() {
    return prisma.event.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { createdBy: { select: { id: true, displayName: true, email: true } } },
    })
  },

  async approve(id: string) {
    return prisma.event.update({
      where: { id },
      data: { status: 'published' },
    })
  },

  async reject(id: string) {
    return prisma.event.update({
      where: { id },
      data: { status: 'rejected' },
    })
  },
}
