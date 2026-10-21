// Marcadores das abas que A8 e A9 preenchem. Cada um recebe só o que o componente real vai precisar.
import type { EventDto } from '../../lib/eventsApi'

/** A8 substitui por <MyEvents onSelectEvent={...} />. */
export function MyEventsPlaceholder(_props: { onSelectEvent: (event: EventDto) => void }) {
  return <p className="com-muted">Suas submissões aparecem aqui em breve.</p>
}

/** A9 substitui por <ReviewQueue onChanged={reloadReviewCount} />. */
export function ReviewQueuePlaceholder(_props: { onChanged: () => void }) {
  return <p className="com-muted">A fila de revisão aparece aqui em breve.</p>
}
