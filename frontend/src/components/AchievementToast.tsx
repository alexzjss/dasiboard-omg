// ── Achievement unlock popup — themed per current theme ──────────────────────
// Xbox 360 style for 720 theme, standard for others
import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Achievement } from '@/pages/ProfilePage'

interface AchievementToastProps {
  achievement: Achievement
  onDismiss: () => void
}

// 8-bit achievement unlock jingle (Xbox 360 style)
function playAchievementSound() {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    const t = ac.currentTime
    // Xbox 360 achievement: ascending 4-note fanfare
    const notes = [[523.25, 0.00, 0.12], [659.25, 0.14, 0.12], [783.99, 0.28, 0.12], [1046.5, 0.42, 0.30]] as const
    notes.forEach(([freq, delay, dur]) => {
      const osc = ac.createOscillator(), g = ac.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, t + delay)
      g.gain.linearRampToValueAtTime(0.12, t + delay + 0.03)
      g.gain.setValueAtTime(0.12, t + delay + dur - 0.04)
      g.gain.linearRampToValueAtTime(0, t + delay + dur)
      osc.connect(g); g.connect(ac.destination)
      osc.start(t + delay); osc.stop(t + delay + dur + 0.01)
    })
  } catch {}
}

export function AchievementToast({ achievement: a, onDismiss }: AchievementToastProps) {
  const { theme } = useTheme()
  const is720 = theme.id === 'light-720'
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (is720) playAchievementSound()
    timerRef.current = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timerRef.current)
  }, [is720, onDismiss])

  if (is720) {
    // Xbox 360 style popup
    return (
      <div
        className="fixed bottom-20 lg:bottom-6 right-4 z-[200] animate-in"
        style={{ width: 320 }}
        onClick={onDismiss}
      >
        <div style={{
          background: 'linear-gradient(180deg, #1a2800 0%, #0d1800 100%)',
          border: '1px solid #6fbe0066',
          borderTop: '2px solid #6fbe00',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 0 20px rgba(111,190,0,0.3), 0 8px 32px rgba(0,0,0,0.6)',
          cursor: 'pointer',
        }}>
          {/* Green top stripe */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#3a7a00,#6fbe00,#3a7a00)' }} />
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Xbox orb */}
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 30%, rgba(200,255,120,0.7) 0%, rgba(111,190,0,1) 35%, rgba(40,80,0,1) 100%)',
              boxShadow: '0 0 12px rgba(111,190,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {a.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 10, color: 'rgba(111,190,0,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Conquista Desbloqueada
              </p>
              <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 14, fontWeight: 700, color: '#c8f07a', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                {a.label}
              </p>
              <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 11, color: 'rgba(200,240,122,0.55)', marginTop: 1 }}>
                {a.desc}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 18, fontWeight: 700, color: '#6fbe00', lineHeight: 1 }}>+50</p>
              <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 9, color: 'rgba(111,190,0,0.5)', letterSpacing: '0.1em' }}>EXP</p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 2, background: 'rgba(111,190,0,0.15)', margin: '0 12px 8px' }}>
            <div style={{ height: '100%', background: '#6fbe00', width: '100%', animation: 'xboxProgress 5s linear forwards' }} />
          </div>
        </div>
      </div>
    )
  }

  // Standard themed toast
  return (
    <div
      className="fixed bottom-20 lg:bottom-6 right-4 z-[200] animate-in"
      style={{ maxWidth: 320 }}
      onClick={onDismiss}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer" style={{
        background: 'var(--bg-card)',
        border: `1px solid ${a.color}44`,
        borderTop: `2px solid ${a.color}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${a.color}22`,
      }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
             style={{ background: a.color + '22', border: `1px solid ${a.color}44` }}>
          {a.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: a.color }}>
            Conquista desbloqueada!
          </p>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
        </div>
        <Trophy size={16} style={{ color: a.color, flexShrink: 0 }} />
      </div>
    </div>
  )
}

// ── Hook to trigger achievement toasts ────────────────────────────────────────
let _listeners: Array<(a: Achievement) => void> = []

export function triggerAchievementToast(a: Achievement) {
  _listeners.forEach(fn => fn(a))
}

export function useAchievementToast() {
  const [pending, setPending] = useState<Achievement | null>(null)

  useEffect(() => {
    const fn = (a: Achievement) => setPending(a)
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(f => f !== fn) }
  }, [])

  const dismiss = () => setPending(null)

  return { pending, dismiss }
}
