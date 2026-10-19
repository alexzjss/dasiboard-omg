import { useSyncExternalStore } from 'react'

/** Breakpoints oficiais (ver tokens.css). */
export const BP_TABLET = '(min-width: 640px)'
export const BP_DESKTOP = '(min-width: 1024px)'

/** Acompanha uma media query. Sem matchMedia (SSR, testes antigos) devolve `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      try {
        const mq = window.matchMedia(query)
        mq.addEventListener('change', cb)
        return () => mq.removeEventListener('change', cb)
      } catch { return () => undefined }
    },
    () => { try { return window.matchMedia(query).matches } catch { return false } },
    () => false,
  )
}
