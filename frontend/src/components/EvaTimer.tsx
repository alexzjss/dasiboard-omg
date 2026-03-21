// ── Eva Theme — NERV-style countdown timer shown on events ───────────────────
import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

interface EvaTimerProps {
  targetDate: string // ISO string
  label?: string
}

export function EvaCountdown({ targetDate, label }: EvaTimerProps) {
  const { theme } = useTheme()
  const [diff, setDiff] = useState(0)

  useEffect(() => {
    const calc = () => setDiff(new Date(targetDate).getTime() - Date.now())
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [targetDate])

  if (theme.id !== 'dark-eva') return null
  if (diff <= 0) return null

  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hrs  = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const pad = (n: number, len = 2) => String(n).padStart(len, '0')

  return (
    <div
      style={{
        fontFamily: '"Orbitron", monospace',
        fontSize: 9,
        letterSpacing: '0.15em',
        color: '#aaff00',
        textShadow: '0 0 8px rgba(170,255,0,0.5)',
        marginTop: 2,
        opacity: 0.85,
      }}
      aria-label={`Contagem regressiva: ${days}d ${pad(hrs)}h ${pad(mins)}m`}
    >
      {days > 0 ? `${days}D ` : ''}{pad(hrs)}:{pad(mins)}:{pad(secs)}
    </div>
  )
}

// ── Full NERV HUD panel — floating bottom bar in Eva theme ───────────────────
export function NervHUD({ events }: { events: Array<{ title: string; start_at: string }> }) {
  const { theme } = useTheme()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (theme.id !== 'dark-eva') return null

  const nextEvent = events
    .filter(e => new Date(e.start_at) > new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '6px 16px',
        background: 'rgba(13,0,16,0.92)',
        border: '1px solid rgba(170,255,0,0.25)',
        borderTop: '2px solid rgba(170,255,0,0.4)',
        borderRadius: 4,
        backdropFilter: 'blur(8px)',
        fontFamily: '"Orbitron", monospace',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: 'rgba(170,255,0,0.7)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#8b00ff', opacity: 0.6 }}>NERV / HQ</span>
      <span style={{ color: 'rgba(170,255,0,0.4)' }}>|</span>
      <span>{timeStr}</span>
      {nextEvent && (
        <>
          <span style={{ color: 'rgba(170,255,0,0.4)' }}>|</span>
          <span style={{ color: '#ff4400', fontSize: 8 }}>
            ⚠ {nextEvent.title.slice(0, 20).toUpperCase()}
          </span>
        </>
      )}
      <span style={{ color: 'rgba(170,255,0,0.4)' }}>|</span>
      <span style={{ opacity: tick % 2 === 0 ? 1 : 0.3 }}>◉ ONLINE</span>
    </div>
  )
}
