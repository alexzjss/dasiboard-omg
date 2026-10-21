import type { CSSProperties } from 'react'
import type { EventDto } from '../../lib/eventsApi'
import type { ScheduleEntry } from '../home/types'
import { dayLongLabel, jupiterWeekdayOfKey, monthOfKey, parseKey, WEEKDAY_HEADERS, type MonthRef } from './calendarFormat'
import { monthGridKeys } from './calendarGrouping'
import { eventColorStyle, kindClass } from './eventColors'

const MAX_CHIPS = 3

type Chip = { id: string; label: string; className: string; style?: CSSProperties }

/**
 * Grade do mês, 6×7. Cada dia mostra até 3 chips e "+N"; no celular os chips viram pontos (CSS).
 * Clicar no dia só seleciona o dia; os eventos se escolhem na lista do dia (`DayList`).
 */
export function MonthGrid({ month, today, eventsByDay, classesByWeekday, selectedDay, onSelectDay }: {
  month: MonthRef
  /** Chave do dia de hoje. */
  today: string
  /** Eventos já filtrados e ordenados, por chave de dia. */
  eventsByDay: ReadonlyMap<string, EventDto[]>
  /** Aulas por dia da semana (já vazio quando o filtro "Aulas" está desligado). */
  classesByWeekday: ScheduleEntry[][]
  selectedDay: string
  onSelectDay: (dayKey: string) => void
}) {
  const keys = monthGridKeys(month)
  return (
    <div className="cal-grid" role="group" aria-label="Dias do mês">
      {WEEKDAY_HEADERS.map((name) => <div key={name} className="cal-weekday" aria-hidden="true">{name}</div>)}
      {keys.map((key) => {
        const events = eventsByDay.get(key) ?? []
        const classes = classesByWeekday[jupiterWeekdayOfKey(key)] ?? []
        const chips: Chip[] = [
          ...events.map((e) => ({ id: e.id, label: e.title, className: kindClass(e.kind), style: eventColorStyle(e) })),
          ...classes.map((c) => ({ id: `${c.code}-${c.startsAt}`, label: c.code, className: 'cal-class' })),
        ]
        const extra = chips.length - MAX_CHIPS
        const inMonth = monthOfKey(key).month === month.month
        const summary = [
          events.length ? `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}` : '',
          classes.length ? `${classes.length} ${classes.length === 1 ? 'aula' : 'aulas'}` : '',
        ].filter(Boolean).join(', ')
        return (
          <button
            key={key}
            type="button"
            className={`cal-day${inMonth ? '' : ' is-outside'}${key === today ? ' is-today' : ''}${key === selectedDay ? ' is-selected' : ''}`}
            aria-label={`${dayLongLabel(key)}${summary ? `, ${summary}` : ''}`}
            aria-pressed={key === selectedDay}
            aria-current={key === today ? 'date' : undefined}
            onClick={() => onSelectDay(key)}
          >
            <span className="cal-daynum mono">{parseKey(key).day}</span>
            <span className="cal-chips" aria-hidden="true">
              {chips.slice(0, MAX_CHIPS).map((chip) => (
                <span key={chip.id} className={`cal-chip ${chip.className}`} style={chip.style}>{chip.label}</span>
              ))}
              {extra > 0 && <span className="cal-more">+{extra}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
