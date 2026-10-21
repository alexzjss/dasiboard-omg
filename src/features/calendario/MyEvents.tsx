import type { CSSProperties } from 'react'
import { KIND_LABEL, type EventDto } from '../../lib/eventsApi'
import { describeWhen, statusBadge } from './calendarFormat'
import { eventColorStyle, kindClass } from './eventColors'
import { useMyEvents } from './hooks/useMyEvents'

type Props = {
  onSelectEvent: (event: EventDto) => void
  onPropose: () => void
  /** Muda a cada alteração feita na página; recarrega a lista. */
  version?: number
}

/** Aba "Minhas submissões": tudo que o usuário propôs, em qualquer status. */
export function MyEvents({ onSelectEvent, onPropose, version = 0 }: Props) {
  const { events, loading, error, reload } = useMyEvents(version)

  if (error) {
    return (
      <div className="cal-error" role="alert">
        <p>Não foi possível carregar suas submissões.</p>
        <button type="button" className="com-btn" onClick={reload}>Tentar de novo</button>
      </div>
    )
  }
  if (loading && events.length === 0) return <p className="com-muted" role="status">Carregando…</p>
  if (events.length === 0) {
    return (
      <div className="cal-empty">
        <p className="com-muted">Você ainda não propôs nenhum evento</p>
        <button type="button" className="com-btn cal-primary" onClick={onPropose}>Propor evento</button>
      </div>
    )
  }
  return (
    <ul className="cal-rows" aria-busy={loading}>
      {events.map((event) => {
        const badge = statusBadge(event)
        const pendingTitle = event.pendingChanges?.title
        return (
          <li key={event.id}>
            <button
              type="button"
              className={`cal-row ${kindClass(event.kind)}${event.status !== 'approved' ? ' is-unapproved' : ''}`}
              style={eventColorStyle(event) as CSSProperties | undefined}
              onClick={() => onSelectEvent(event)}
            >
              <span className="cal-row-main">
                <span className="cal-row-title">{event.title}</span>
                <span className="cal-row-meta">{describeWhen(event)}</span>
                <span className="cal-row-meta">{event.scopeLabel} · {KIND_LABEL[event.kind]}</span>
                {event.status === 'rejected' && event.reviewNote && <span className="cal-row-meta">Motivo da recusa: {event.reviewNote}</span>}
                {event.pendingChanges && <span className="cal-row-meta">Edição pendente{pendingTitle ? `: ${pendingTitle}` : ''}</span>}
              </span>
              {badge && <span className="cal-status">{badge}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
