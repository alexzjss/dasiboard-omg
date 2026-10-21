import type { EventDto } from '../../lib/eventsApi'
import type { ScheduleEntry } from '../home/types'
import { dayLongLabel } from './calendarFormat'
import { EventRow } from './EventRow'

/** Lista do dia selecionado, abaixo da grade do mês: eventos e, em cinza, as aulas do Júpiter. */
export function DayList({ dayKey, events, classes, selectedEventId, onSelectEvent }: {
  dayKey: string
  events: EventDto[]
  classes: ScheduleEntry[]
  selectedEventId?: string | null
  onSelectEvent: (event: EventDto) => void
}) {
  const empty = events.length === 0 && classes.length === 0
  return (
    <section className="cal-daylist" aria-label={`Dia ${dayLongLabel(dayKey)}`}>
      <h2 className="cal-daylist-title">{dayLongLabel(dayKey)}</h2>
      {empty ? (
        <p className="com-muted">Nada marcado por aqui</p>
      ) : (
        <ul className="cal-rows">
          {events.map((event) => (
            <li key={event.id}><EventRow event={event} selected={event.id === selectedEventId} onSelect={onSelectEvent} /></li>
          ))}
          {classes.map((entry) => (
            <li key={`${entry.code}-${entry.startsAt}`} className="cal-row cal-row-class">
              <span className="cal-row-time mono">{entry.startsAt}–{entry.endsAt}</span>
              <span className="cal-row-main">
                <span className="cal-row-title">{entry.code} · {entry.title}</span>
                <span className="cal-row-meta">Aula{entry.room ? ` · ${[entry.building, entry.room].filter(Boolean).join(' ')}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
