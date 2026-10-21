import { useCallback, useEffect, useState } from 'react'
import { fetchEventScopes, type EventScopeOption } from '../../../lib/eventsApi'

type State = { scopes: EventScopeOption[]; loading: boolean; error: unknown }

/** Escopos em que o usuário pode propor eventos, com a indicação de quais passam por moderação. */
export function useEventScopes() {
  const [state, setState] = useState<State>({ scopes: [], loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchEventScopes(controller.signal).then(
      (scopes) => {
        if (!controller.signal.aborted) setState({ scopes, loading: false, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ scopes: [], loading: false, error })
      },
    )
    return () => controller.abort()
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { scopes: state.scopes, loading: state.loading, error: state.error, reload }
}
