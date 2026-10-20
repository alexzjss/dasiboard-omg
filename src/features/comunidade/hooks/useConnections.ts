import { useCallback, useEffect, useRef, useState } from 'react'
import { listConnections, type ConnectionPerson, type ConnectionStatus, type PendingRequest } from '../../../lib/socialApi'

export type ConnectionsFor<S extends ConnectionStatus> = S extends 'pending' ? PendingRequest[] : ConnectionPerson[]

type State<S extends ConnectionStatus> = { connections: ConnectionsFor<S>; loading: boolean; error: unknown }

/** Pedidos recebidos (`pending`) ou conexões aceitas (`accepted`). */
export function useConnections<S extends ConnectionStatus>(status: S) {
  const [state, setState] = useState<State<S>>({ connections: [] as unknown as ConnectionsFor<S>, loading: true, error: null })
  const requestRef = useRef<AbortController | null>(null)

  const reload = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      // listConnections não recebe signal; a guarda abaixo descarta a resposta de uma busca já superada.
      const connections = (await listConnections(status as 'pending')) as ConnectionsFor<S>
      if (controller.signal.aborted) return
      setState({ connections, loading: false, error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [status])

  useEffect(() => {
    void reload()
    return () => requestRef.current?.abort()
  }, [reload])

  return { connections: state.connections, loading: state.loading, error: state.error, reload }
}
