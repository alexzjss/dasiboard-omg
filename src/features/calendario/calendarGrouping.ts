import type { EventDto } from '../../lib/eventsApi'
import type { ScheduleEntry } from '../home/types'
import { addDays, type MonthRef } from './calendarFormat'
import { eventDays, monthGridRange, saoPauloDateKey } from './dateRange'

/** Aulas por dia da semana do Júpiter (índice 0 = segunda), já ordenadas por horário. */
export function groupClassesByWeekday(schedule: ScheduleEntry[]): ScheduleEntry[][] {
  const byDay: ScheduleEntry[][] = Array.from({ length: 7 }, () => [])
  for (const entry of schedule) if (entry.weekday >= 0 && entry.weekday <= 6) byDay[entry.weekday].push(entry)
  for (const list of byDay) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return byDay
}

/** As 42 chaves de dia (6 semanas, domingo primeiro) do mês. */
export function monthGridKeys({ year, month }: MonthRef): string[] {
  const first = saoPauloDateKey(monthGridRange(year, month).from.toISOString())
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

/** Eventos agrupados por dia (um evento de vários dias aparece em cada um). Só dias entre `fromKey` e `toKey` (exclusivo). */
export function groupEventsByDay(events: EventDto[], fromKey: string, toKey: string): [string, EventDto[]][] {
  const byDay = new Map<string, EventDto[]>()
  for (const event of events) {
    for (const key of eventDays(event)) {
      if (key < fromKey || key >= toKey) continue
      const list = byDay.get(key)
      if (list) list.push(event)
      else byDay.set(key, [event])
    }
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
}
