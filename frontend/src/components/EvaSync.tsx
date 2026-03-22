// ── Eva theme: sync rate bar in sidebar + special achievement at 100% ─────────
import { useEffect, useState, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { triggerAchievementToast } from '@/components/AchievementToast'

const SYNC_KEY = 'dasiboard-eva-sync'

function getSavedSync(): number {
  return parseFloat(localStorage.getItem(SYNC_KEY) ?? '0')
}

export function useEvaSyncRate() {
  const { theme } = useTheme()
  const [syncRate, setSyncRate] = useState(getSavedSync)
  const [maxReached, setMaxReached] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const isEva = theme.id === 'dark-eva'

  // Slowly increase sync rate as user interacts
  useEffect(() => {
    if (!isEva) return
    // Gain sync rate passively over time (slow), faster on interactions
    intervalRef.current = setInterval(() => {
      setSyncRate(v => {
        const next = Math.min(100, v + 0.04)
        localStorage.setItem(SYNC_KEY, String(next))
        return next
      })
    }, 1200)
    return () => clearInterval(intervalRef.current)
  }, [isEva])

  // Boost on any user interaction
  useEffect(() => {
    if (!isEva) return
    const boost = () => {
      setSyncRate(v => {
        const next = Math.min(100, v + 0.8)
        localStorage.setItem(SYNC_KEY, String(next))
        return next
      })
    }
    window.addEventListener('click', boost, { passive: true })
    window.addEventListener('keydown', boost, { passive: true })
    return () => {
      window.removeEventListener('click', boost)
      window.removeEventListener('keydown', boost)
    }
  }, [isEva])

  // Unlock achievement at 100%
  useEffect(() => {
    if (!isEva || maxReached || syncRate < 100) return
    setMaxReached(true)
    if (!localStorage.getItem('dasiboard-eva-100')) {
      localStorage.setItem('dasiboard-eva-100', '1')
      triggerAchievementToast({
        id: 'eva_sync_100',
        emoji: '🤖',
        label: 'Sincronização Total',
        desc: 'Taxa de sincronização atingiu 100%!',
        hint: '???',
        color: '#aaff00',
        rarity: 'legendary',
        unlocked: true,
        category: 'secret',
      })
    }
  }, [isEva, syncRate, maxReached])

  return { syncRate, isEva }
}

export function EvaSyncBar() {
  const { syncRate, isEva } = useEvaSyncRate()
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!isEva) return
    const t = setInterval(() => setPulse(v => !v), 800)
    return () => clearInterval(t)
  }, [isEva])

  if (!isEva) return null

  const color = syncRate >= 90 ? '#ff4400' : syncRate >= 60 ? '#aaff00' : '#8b00ff'
  const status = syncRate >= 100 ? 'SYNC COMPLETO' : syncRate >= 90 ? 'ALERTA' : 'INICIANDO'

  return (
    <div className="px-3 pb-2" aria-hidden="true">
      <div className="rounded-xl px-3 py-2"
           style={{ background: 'rgba(139,0,255,0.08)', border: `1px solid ${color}33` }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: 'rgba(170,255,0,0.5)', letterSpacing: '0.2em' }}>
            SYNC RATE
          </span>
          <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, color, letterSpacing: '0.1em', opacity: pulse ? 1 : 0.6, transition: 'opacity 0.3s' }}>
            {syncRate >= 100 ? '100%' : `${syncRate.toFixed(1)}%`}
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(139,0,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${syncRate}%`,
            background: `linear-gradient(90deg, #8b00ff, ${color})`,
            boxShadow: `0 0 6px ${color}88`,
            transition: 'width 1.2s linear',
          }} />
        </div>
        <p style={{ fontFamily: '"Orbitron", monospace', fontSize: 7, color: `${color}66`, marginTop: 3, letterSpacing: '0.15em', textAlign: 'right' }}>
          {status}
        </p>
      </div>
    </div>
  )
}
