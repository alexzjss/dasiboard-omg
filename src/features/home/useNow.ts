import { useEffect, useState } from 'react'

/** Data/hora atual, atualizada na virada de cada minuto (e ao voltar para a aba). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval: number | undefined
    const tick = () => setNow(new Date())
    const timeout = window.setTimeout(() => {
      tick()
      interval = window.setInterval(tick, 60_000)
    }, 60_000 - (Date.now() % 60_000))
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timeout)
      if (interval !== undefined) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}
