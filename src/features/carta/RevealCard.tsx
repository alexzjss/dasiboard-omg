import { useEffect } from 'react'
import { ProfileCard } from '../../components/card/ProfileCard'
import type { CardData } from '../../lib/socialApi'

export const REVEAL_MS = 900

/** Sem matchMedia (ou com reduced motion) a carta aparece direto, sem giro. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A carta aparece de costas e vira com brilho ao ser colecionada. */
export function RevealCard({ data, onDone }: { data: CardData; onDone: () => void }) {
  const instant = prefersReducedMotion()
  useEffect(() => {
    const timer = window.setTimeout(onDone, instant ? 0 : REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [instant, onDone])

  if (instant) return <ProfileCard data={data} />
  return (
    <div className="reveal-card" data-testid="reveal-card">
      <ProfileCard data={data} />
      <div className="reveal-cover" aria-hidden="true"><span>daSIboard</span></div>
    </div>
  )
}
