import { useCallback, useEffect, useState } from 'react'
import { fetchReviewCount } from '../../../lib/eventsApi'

/** Quantos itens esperam moderação. Falha vale 0, em silêncio (o contador é só um aviso). */
export function useReviewCount() {
  const [count, setCount] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchReviewCount(controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setCount(next)
      },
      () => {
        if (!controller.signal.aborted) setCount(0)
      },
    )
    return () => controller.abort()
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { count, reload }
}
