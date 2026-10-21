// Formatação e aritmética de dias do calendário. Dia = chave 'YYYY-MM-DD' no fuso de São Paulo.
import type { EventDto } from '../../lib/eventsApi'
import { saoPauloDateKey } from './dateRange'

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const WEEKDAY_HEADERS = WEEKDAY_SHORT

export type MonthRef = { year: number; month: number }

export function parseKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month: month - 1, day }
}

export function todayKey(now: Date = new Date()): string {
  return saoPauloDateKey(now.toISOString())
}

export function monthOfKey(key: string): MonthRef {
  const { year, month } = parseKey(key)
  return { year, month }
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key)
  return new Date(Date.UTC(year, month, day + days)).toISOString().slice(0, 10)
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(Date.UTC(year, month + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

export function monthKey(ref: MonthRef, day = 1): string {
  return new Date(Date.UTC(ref.year, ref.month, day)).toISOString().slice(0, 10)
}

/** 0 = domingo. */
export function weekdayOfKey(key: string): number {
  const { year, month, day } = parseKey(key)
  return new Date(Date.UTC(year, month, day)).getUTCDay()
}

/** Dia da semana como a grade do Júpiter conta: 0 = segunda. */
export function jupiterWeekdayOfKey(key: string): number {
  return (weekdayOfKey(key) + 6) % 7
}

export function monthTitle({ year, month }: MonthRef): string {
  return `${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)} de ${year}`
}

/** "Qua, 21 out" */
export function dayLabel(key: string): string {
  const { month, day } = parseKey(key)
  return `${WEEKDAY_SHORT[weekdayOfKey(key)]}, ${day} ${MONTHS_SHORT[month]}`
}

/** "21 de outubro" */
export function dayLongLabel(key: string): string {
  const { month, day } = parseKey(key)
  return `${day} de ${MONTHS[month]}`
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' })

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "Dia todo", "14:00" ou "14:00–16:00". */
export function formatEventTime(event: Pick<EventDto, 'startsAt' | 'endsAt' | 'allDay'>): string {
  if (event.allDay) return 'Dia todo'
  const start = formatTime(event.startsAt)
  if (!event.endsAt || saoPauloDateKey(event.endsAt) !== saoPauloDateKey(event.startsAt)) return start
  return `${start}–${formatTime(event.endsAt)}`
}

/** Selo de status ou null quando está tudo normal. */
export function statusBadge(event: Pick<EventDto, 'status' | 'pendingChanges'>): string | null {
  switch (event.status) {
    case 'pending': return 'Aguardando aprovação'
    case 'hidden': return 'Escondido'
    case 'rejected': return 'Recusado'
    case 'cancelled': return 'Cancelado'
    default: return event.pendingChanges ? 'Edição pendente' : null
  }
}

/** Ordem dentro do dia: dia inteiro primeiro, depois por horário. */
export function compareEvents(a: EventDto, b: EventDto): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
  return a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title, 'pt-BR')
}
