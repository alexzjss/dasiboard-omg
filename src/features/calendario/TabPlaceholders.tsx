// Marcadores das abas que a A9 preenche. Cada um recebe só o que o componente real vai precisar.

/** A9 substitui por <ReviewQueue onChanged={reloadReviewCount} />. */
export function ReviewQueuePlaceholder(_props: { onChanged: () => void }) {
  return <p className="com-muted">A fila de revisão aparece aqui em breve.</p>
}
