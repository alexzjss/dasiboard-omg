import { useCallback, useEffect, useState } from 'react'
import { fetchEvents, type EventDto } from '../../../lib/eventsApi'
import { toApiIso } from '../dateRange'

type State = { events: EventDto[]; loading: boolean; error: unknown }

/**
 * Eventos do intervalo (fim exclusivo). Mudar o intervalo ou `otherClasses` refaz a busca e cancela a anterior,
 * então uma resposta atrasada nunca sobrescreve a do intervalo atual. Enquanto a nova busca roda, os eventos
 * anteriores continuam na tela para não piscar o grid.
 */
export function useEvents(range: { from: Date; to: Date }, opts: { otherClasses: boolean }) {
  const fromMs = range.from.getTime()
  const toMs = range.to.getTime()
  const { otherClasses } = opts
  const [state, setState] = useState<State>({ events: [], loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    const apiRange = { from: toApiIso(new Date(fromMs)), to: toApiIso(new Date(toMs)) }
    fetchEvents(apiRange, { otherClasses }, controller.signal).then(
      (events) => {
        if (!controller.signal.aborted) setState({ events, loading: false, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ events: [], loading: false, error })
      },
    )
    return () => controller.abort()
  }, [fromMs, toMs, otherClasses, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { events: state.events, loading: state.loading, error: state.error, reload }
}
