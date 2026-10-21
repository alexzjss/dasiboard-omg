import { useCallback, useEffect, useState } from 'react'
import { fetchReviewQueue, type ReviewEventDto } from '../../../lib/eventsApi'

type State = { events: ReviewEventDto[]; loading: boolean; error: unknown }

/** Fila de moderação do usuário (novos, edições e denunciados). Sem permissão de moderação, o servidor responde 403. */
export function useReviewQueue() {
  const [state, setState] = useState<State>({ events: [], loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchReviewQueue(controller.signal).then(
      (events) => {
        if (!controller.signal.aborted) setState({ events, loading: false, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ events: [], loading: false, error })
      },
    )
    return () => controller.abort()
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { events: state.events, loading: state.loading, error: state.error, reload }
}
