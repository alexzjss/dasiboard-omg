import type { EventDto } from '../../lib/eventsApi'
import { dayLabel, formatEventTime } from './calendarFormat'
import { saoPauloDateKey } from './dateRange'

/**
 * Painel mínimo do evento selecionado (título e data). A8 troca este componente pelo EventDetail completo,
 * mantendo as props: `event` e `onClose`.
 */
export function EventDetailPanel({ event, onClose }: { event: EventDto; onClose: () => void }) {
  return (
    <aside className="cal-panel" aria-label="Detalhe do evento">
      <div className="cal-panel-head">
        <h2>{event.title}</h2>
        <button type="button" className="com-btn" onClick={onClose}>Fechar</button>
      </div>
      <p className="com-muted">{dayLabel(saoPauloDateKey(event.startsAt))} · {formatEventTime(event)}</p>
    </aside>
  )
}
