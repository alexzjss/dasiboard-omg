// ── Chrono portal sound hook — separate file to avoid circular deps ───────────
import { useEffect } from 'react'
import { playChronoPortal } from './useAudioEasterEggs'

export function useChronoPortalSound() {
  useEffect(() => {
    const handler = () => playChronoPortal()
    document.addEventListener('chrono:era-change', handler)
    return () => document.removeEventListener('chrono:era-change', handler)
  }, [])
}
