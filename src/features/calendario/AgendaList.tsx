import type { EventDto } from '../../lib/eventsApi'
import { dayLabel } from './calendarFormat'
import { groupEventsByDay } from './calendarGrouping'
import { EventRow } from './EventRow'

/** Visão Agenda: próximos 30 dias, um bloco por dia. `events` já vem filtrado e ordenado. */
export function AgendaList({ events, fromKey, toKey, selectedEventId, onSelectEvent }: {
  events: EventDto[]
  fromKey: string
  toKey: string
  selectedEventId?: string | null
  onSelectEvent: (event: EventDto) => void
}) {
  const groups = groupEventsByDay(events, fromKey, toKey)
  if (groups.length === 0) return <p className="com-muted cal-empty">Nada marcado por aqui</p>
  return (
    <div className="cal-agenda">
      {groups.map(([key, list]) => (
        <section key={key} className="cal-agenda-day" aria-label={dayLabel(key)}>
          <h2 className="cal-agenda-date">{dayLabel(key)}</h2>
          <ul className="cal-rows">
            {list.map((event) => (
              <li key={event.id}><EventRow event={event} selected={event.id === selectedEventId} onSelect={onSelectEvent} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
