import { useCallback, useEffect, useState } from 'react'
import { fetchReviewCount } from '../../../lib/eventsApi'

/** Quantos itens esperam moderação e se o usuário modera algo. Falha vale 0 / false, em silêncio (o contador é só um aviso). */
export function useReviewCount() {
  const [state, setState] = useState({ count: 0, moderates: false })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchReviewCount(controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setState(next)
      },
      () => {
        if (!controller.signal.aborted) setState({ count: 0, moderates: false })
      },
    )
    return () => controller.abort()
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { count: state.count, moderates: state.moderates, reload }
}
