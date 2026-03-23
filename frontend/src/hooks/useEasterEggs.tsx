// ── Easter Eggs — sequence detection + lazy-loaded screens ──────────────────
// Each screen is in its own file under components/easter-eggs/
// They are lazy-loaded so the ~35KB of canvas/animation code only loads
// when the user actually triggers an easter egg.

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { playKonamiJingle, playModemNoise } from './useAudioEasterEggs'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'
import { LocalErrorBoundary } from '@/components/ErrorBoundary'

// ── Lazy screen imports ────────────────────────────────────────────────────────
const KonamiScreen       = lazy(() => import('@/components/easter-eggs/EggKonami'))
const VaporScreen        = lazy(() => import('@/components/easter-eggs/EggVapor'))
const MatrixScreen       = lazy(() => import('@/components/easter-eggs/EggMatrix'))
const SilentHillScreen   = lazy(() => import('@/components/easter-eggs/EggSilentHill'))
const XboxScreen         = lazy(() => import('@/components/easter-eggs/EggXbox'))
const RGBGlitchScreen    = lazy(() => import('@/components/easter-eggs/EggRGB'))
const BlueprintScreen    = lazy(() => import('@/components/easter-eggs/EggBlueprint'))
const IlhaScreen         = lazy(() => import('@/components/easter-eggs/EggIlha'))
const VidroScreen        = lazy(() => import('@/components/easter-eggs/EggVidro'))
const NervAlertScreen    = lazy(() => import('@/components/easter-eggs/EggNerv'))
const BreakoutGame       = lazy(() => import('@/components/easter-eggs/EggBreakout'))
const HypeParticlesScreen= lazy(() => import('@/components/easter-eggs/EggHype'))
const HackerScreen       = lazy(() => import('@/components/easter-eggs/EggHacker'))
const DasiFlipScreen     = lazy(() => import('@/components/easter-eggs/EggDasiFlip'))
const PersonaScreen      = lazy(() => import('@/components/easter-eggs/EggPersona'))

// ── Sequence detector ─────────────────────────────────────────────────────────
function useSequence(sequence: string[], onMatch: () => void, timeoutMs = 2000) {
  const progress = useRef<number>(0)
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sequence.length) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      const expected = sequence[progress.current]
      const got = e.key === 'ArrowUp' ? 'ArrowUp'
        : e.key === 'ArrowDown'  ? 'ArrowDown'
        : e.key === 'ArrowLeft'  ? 'ArrowLeft'
        : e.key === 'ArrowRight' ? 'ArrowRight'
        : e.key.toLowerCase()

      if (got === expected) {
        progress.current++
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { progress.current = 0 }, timeoutMs)
        if (progress.current === sequence.length) {
          progress.current = 0
          if (timer.current) clearTimeout(timer.current)
          onMatch()
        }
      } else {
        progress.current = got === sequence[0] ? 1 : 0
        if (timer.current) clearTimeout(timer.current)
        if (progress.current > 0)
          timer.current = setTimeout(() => { progress.current = 0 }, timeoutMs)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sequence, onMatch, timeoutMs])
}

// ── Theme-specific sequences ──────────────────────────────────────────────────
const THEME_SEQUENCES: Record<string, { seq: string[]; name: string }> = {
  'dark-hypado':     { seq: ['ArrowUp','ArrowUp','ArrowUp'], name: 'vapor' },
  'dark-shell':      { seq: ['m','a','t','r','i','x'], name: 'matrix' },
  'dark-colina':     { seq: ['s','i','l','e','n','t'], name: 'silent' },
  'dark-dlc':        { seq: ['r','g','b'], name: 'rgb' },
  'light-blueprint': { seq: ['b','l','u','e'], name: 'blueprint' },
  'light-ilha':      { seq: ['i','l','h','a'], name: 'ilha' },
  'light-vidro':     { seq: ['v','i','d','r','o'], name: 'vidro' },
  'dark-eva':        { seq: ['n','e','r','v'], name: 'nerv' },
  'light-memento':   { seq: ['p','e','r','s','o','n','a'], name: 'persona' },
}

export type EasterEggId =
  | 'konami' | 'vapor' | 'matrix' | 'silent' | 'xbox' | 'rgb'
  | 'blueprint' | 'ilha' | 'vidro' | 'nerv' | 'persona' | 'breakout'
  | 'hacker' | 'dasi-flip' | 'hype-particles'
  | null

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useEasterEggs() {
  const [active, setActive] = useState<EasterEggId>(null)
  const { theme } = useTheme()
  const close = useCallback(() => setActive(null), [])
  const themeData = THEME_SEQUENCES[theme.id]

  const trigger = useCallback(() => {
    if (!themeData) return
    const eggId = themeData.name as EasterEggId
    setActive(eggId)
    if (eggId === 'konami') playKonamiJingle()
    if (eggId === 'matrix') playModemNoise()
    addExp(EXP_REWARDS.easterEgg)
  }, [themeData])

  useSequence(themeData?.seq ?? [], trigger)
  return { active, close }
}

// ── Renderer ──────────────────────────────────────────────────────────────────
export function EasterEggRenderer({ active, onClose }: { active: EasterEggId; onClose: () => void }) {
  if (!active) return null

  // Skip heavy canvas animations for reduced-motion users
  const reduced = prefersReducedMotion()
  if (reduced && ['matrix', 'breakout', 'rgb', 'hype-particles'].includes(active)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
           style={{ background: 'rgba(0,0,0,0.85)', zIndex: 999 }}
           onClick={onClose} role="dialog" aria-modal="true">
        <div className="text-center p-8">
          <p style={{ fontSize: 48 }}>🎉</p>
          <p className="mt-3 text-sm font-medium" style={{ color: '#fff' }}>Easter egg desbloqueado!</p>
          <p className="text-xs mt-1 opacity-60" style={{ color: '#fff' }}>(animação desativada por preferência de acessibilidade)</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>Fechar</button>
        </div>
      </div>
    )
  }

  const props = { onClose }
  const screen = (() => {
    switch (active) {
      case 'konami':        return <KonamiScreen {...props} />
      case 'vapor':         return <VaporScreen {...props} />
      case 'matrix':        return <MatrixScreen {...props} />
      case 'silent':        return <SilentHillScreen {...props} />
      case 'xbox':          return <XboxScreen {...props} />
      case 'rgb':           return <RGBGlitchScreen {...props} />
      case 'blueprint':     return <BlueprintScreen {...props} />
      case 'ilha':          return <IlhaScreen {...props} />
      case 'vidro':         return <VidroScreen {...props} />
      case 'nerv':          return <NervAlertScreen {...props} />
      case 'persona':       return <PersonaScreen {...props} />
      case 'breakout':      return <BreakoutGame {...props} />
      case 'hacker':        return <HackerScreen {...props} />
      case 'dasi-flip':     return <DasiFlipScreen {...props} />
      case 'hype-particles':return <HypeParticlesScreen {...props} />
      default:              return null
    }
  })()

  return (
    <LocalErrorBoundary onError={onClose} fallback={null}>
      <Suspense fallback={
        <div className="fixed inset-0 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.7)', zIndex: 999 }}>
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
        </div>
      }>
        {screen}
      </Suspense>
    </LocalErrorBoundary>
  )
}

// ── Safe wrapper ──────────────────────────────────────────────────────────────
export function SafeEasterEggRenderer(props: { active: EasterEggId; onClose: () => void }) {
  return (
    <LocalErrorBoundary onError={props.onClose} fallback={null}>
      <EasterEggRenderer {...props} />
    </LocalErrorBoundary>
  )
}

// ── External trigger ──────────────────────────────────────────────────────────
let _eggListeners: Array<(id: EasterEggId) => void> = []
export function triggerEasterEgg(id: EasterEggId) {
  _eggListeners.forEach(fn => fn(id))
}
export function useExternalEasterEgg(onTrigger: (id: EasterEggId) => void) {
  useEffect(() => {
    _eggListeners.push(onTrigger)
    return () => { _eggListeners = _eggListeners.filter(f => f !== onTrigger) }
  }, [onTrigger])
}

// ── Clock easter eggs ─────────────────────────────────────────────────────────
export function useClockEasterEggs(triggerNotif: (msg: string) => void) {
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds()
      const key = `dasiboard-clock-egg-${now.toISOString().slice(0,10)}`
      const seen = JSON.parse(localStorage.getItem(key) ?? '{}')
      if (h === 0 && m === 0 && s < 30 && !seen['midnight']) {
        seen['midnight'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('midnight')
      }
      if (h === 4 && m === 0 && s < 30 && !seen['4am']) {
        seen['4am'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('4am')
      }
      if (h === 3 && m === 33 && s < 30 && !seen['333']) {
        seen['333'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('333')
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [])
}
