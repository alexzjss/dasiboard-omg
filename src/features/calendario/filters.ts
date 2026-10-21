import type { EventDto } from '../../lib/eventsApi'
import { loadCalendarFilters } from '../../lib/storage'

export type CalendarFilters = {
  /** Eventos da USP e do campus. */
  usp: boolean
  /** Eventos do curso e da turma. */
  course: boolean
  /** Eventos das matérias que a pessoa cursa. */
  mine: boolean
  /** Eventos de matérias que a pessoa não cursa (manda `otherClasses` ao servidor). */
  others: boolean
  entities: boolean
  /** Aulas do Júpiter (grade horária). */
  classes: boolean
}

export const DEFAULT_FILTERS: CalendarFilters = { usp: true, course: true, mine: true, others: false, entities: true, classes: true }

export const FILTER_OPTIONS: { key: keyof CalendarFilters; label: string }[] = [
  { key: 'usp', label: 'USP e campus' },
  { key: 'course', label: 'Curso e turma' },
  { key: 'mine', label: 'Minhas matérias' },
  { key: 'others', label: 'Outras matérias' },
  { key: 'entities', label: 'Entidades' },
  { key: 'classes', label: 'Aulas' },
]

export function initialFilters(): CalendarFilters {
  return { ...DEFAULT_FILTERS, ...loadCalendarFilters() }
}

/**
 * Aplica os filtros a um evento. Sem "outras matérias" o servidor só devolve matérias da pessoa,
 * então todo evento de matéria conta como "minha". Com o filtro ligado, "minha" é a matéria que está na grade do Júpiter.
 */
export function eventPassesFilters(event: EventDto, filters: CalendarFilters, myCodes: ReadonlySet<string>): boolean {
  switch (event.scope) {
    case 'usp':
    case 'campus':
      return filters.usp
    case 'course':
    case 'cohort':
      return filters.course
    case 'entity':
      return filters.entities
    case 'class': {
      const isMine = !filters.others || (event.scopeValue !== null && myCodes.has(event.scopeValue))
      return isMine ? filters.mine : filters.others
    }
  }
}
