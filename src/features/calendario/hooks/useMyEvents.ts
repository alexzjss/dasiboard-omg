import { useCallback, useEffect, useState } from 'react'
import { fetchMyEvents, type EventDto } from '../../../lib/eventsApi'

type State = { events: EventDto[]; loading: boolean; error: unknown }

/** Eventos que o próprio usuário propôs (qualquer status). */
export function useMyEvents(version = 0) {
  const [state, setState] = useState<State>({ events: [], loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchMyEvents(controller.signal).then(
      (events) => {
        if (!controller.signal.aborted) setState({ events, loading: false, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ events: [], loading: false, error })
      },
    )
    return () => controller.abort()
  }, [tick, version])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { events: state.events, loading: state.loading, error: state.error, reload }
}
