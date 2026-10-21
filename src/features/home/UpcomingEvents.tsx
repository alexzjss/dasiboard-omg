import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { EventDto } from '../../lib/eventsApi'
import { agendaRange, eventDays, saoPauloDateKey } from '../calendario/dateRange'
import { compareEvents, dayLabel, formatEventTime, todayKey } from '../calendario/calendarFormat'
import { eventColorStyle, kindClass } from '../calendario/eventColors'
import { useEvents } from '../calendario/hooks/useEvents'
import { useNow } from './useNow'

const WINDOW_DAYS = 14
const MAX_ITEMS = 5

/** Quem ainda não terminou: dia inteiro conta até o último dia; evento com horário, até o fim (ou o início, sem fim). */
function hasNotEnded(event: EventDto, now: Date, today: string): boolean {
  if (event.allDay) {
    const days = eventDays(event)
    return days[days.length - 1] >= today
  }
  return Date.parse(event.endsAt ?? event.startsAt) > now.getTime()
}

/** Aprovados que ainda não terminaram, em ordem de início (dia inteiro primeiro dentro do dia). */
function upcomingOf(events: EventDto[], now: Date, today: string): EventDto[] {
  return events
    .filter((event) => event.status === 'approved' && hasNotEnded(event, now, today))
    .sort((a, b) => saoPauloDateKey(a.startsAt).localeCompare(saoPauloDateKey(b.startsAt)) || compareEvents(a, b))
    .slice(0, MAX_ITEMS)
}

/** Card da Home com os próximos eventos aprovados. Se a busca falha, não aparece. */
export function UpcomingEvents() {
  const now = useNow()
  const today = todayKey(now)
  const range = useMemo(() => agendaRange(now, WINDOW_DAYS), [now])
  const { events, loading, error } = useEvents(range, { otherClasses: false })
  const items = useMemo(() => upcomingOf(events, now, today), [events, now, today])

  if (error) return null

  return (
    <section className="section-block upcoming-block" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title">Próximos eventos</h2>
      <p className="section-hint">Eventos aprovados nas próximas duas semanas.</p>

      {loading ? (
        <p className="upcoming-status" role="status">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="upcoming-empty">
          <p>Nada marcado nas próximas duas semanas</p>
          <Link to="/calendario" className="upcoming-link">Propor evento</Link>
        </div>
      ) : (
        <ol className="upcoming-list">
          {items.map((event) => (
            <li key={event.id}>
              <Link
                to={`/calendario?evento=${encodeURIComponent(event.id)}`}
                className={`upcoming-item ${kindClass(event.kind)}`}
                style={eventColorStyle(event) as CSSProperties | undefined}
              >
                <span className="upcoming-dot" aria-hidden="true" />
                <span className="upcoming-when">
                  <span>{dayLabel(saoPauloDateKey(event.startsAt))}</span>
                  <span className="mono">{formatEventTime(event)}</span>
                </span>
                <span className="upcoming-main">
                  <span className="upcoming-title">{event.title}</span>
                  <span className="upcoming-scope">{event.scopeLabel}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="upcoming-foot">
        <Link to="/calendario" className="upcoming-link">Ver calendário</Link>
      </div>
    </section>
  )
}
