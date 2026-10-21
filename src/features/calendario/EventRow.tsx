import type { CSSProperties } from 'react'
import { KIND_LABEL, type EventDto } from '../../lib/eventsApi'
import { Icon } from '../../components/Icon'
import { formatEventTime, statusBadge } from './calendarFormat'
import { eventColorStyle, kindClass } from './eventColors'

/** Linha de evento (lista do dia e agenda). Clicar chama `onSelect`. */
export function EventRow({ event, selected, onSelect }: { event: EventDto; selected?: boolean; onSelect: (event: EventDto) => void }) {
  const badge = statusBadge(event)
  return (
    <button
      type="button"
      className={`cal-row ${kindClass(event.kind)}${selected ? ' is-selected' : ''}${event.status !== 'approved' ? ' is-unapproved' : ''}`}
      style={eventColorStyle(event) as CSSProperties | undefined}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(event)}
    >
      <span className="cal-row-time mono">{formatEventTime(event)}</span>
      <span className="cal-row-main">
        <span className="cal-row-title">{event.title}</span>
        <span className="cal-row-meta">{event.scopeLabel} · {KIND_LABEL[event.kind]}</span>
      </span>
      {event.rsvp.mine === 'going' && <span className="cal-row-going" role="img" aria-label="Você vai" title="Você vai"><Icon name="check" /></span>}
      {badge && <span className="cal-status">{badge}</span>}
    </button>
  )
}
