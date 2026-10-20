import { useCallback, useEffect, useRef, useState } from 'react'
import { getPerson, type PersonProfile } from '../../../lib/socialApi'

type State = { person: PersonProfile | null; loading: boolean; error: unknown }

/** Perfil público de um aluno pelo handle. Troca de handle cancela a busca anterior. */
export function usePerson(handle: string) {
  const [state, setState] = useState<State>({ person: null, loading: true, error: null })
  const requestRef = useRef<AbortController | null>(null)

  const reload = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const person = await getPerson(handle, controller.signal)
      if (controller.signal.aborted) return
      setState({ person, loading: false, error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({ person: null, loading: false, error })
    }
  }, [handle])

  useEffect(() => {
    void reload()
    return () => requestRef.current?.abort()
  }, [reload])

  return { person: state.person, loading: state.loading, error: state.error, reload }
}
