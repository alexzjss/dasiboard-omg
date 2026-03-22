import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Timer, Brain, X, Play, Pause, RotateCcw,
  Volume2, VolumeX, ChevronRight, Check,
  Zap, Target, ChevronDown,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────
type PomodoroPhase = 'focus' | 'short-break' | 'long-break'

const PHASE_CONFIG: Record<PomodoroPhase, { label: string; minutes: number; color: string; emoji: string }> = {
  'focus':       { label: 'Foco',         minutes: 25, color: '#ef4444', emoji: '🎯' },
  'short-break': { label: 'Pausa curta',  minutes: 5,  color: '#22c55e', emoji: '☕' },
  'long-break':  { label: 'Pausa longa',  minutes: 15, color: '#3b82f6', emoji: '🌿' },
}

const AMBIENT_SOUNDS = [
  { id: 'none',   label: 'Silêncio',     emoji: '🔇' },
  { id: 'rain',   label: 'Chuva',        emoji: '🌧️' },
  { id: 'cafe',   label: 'Café',         emoji: '☕' },
  { id: 'forest', label: 'Floresta',     emoji: '🌲' },
  { id: 'waves',  label: 'Ondas',        emoji: '🌊' },
  { id: 'white',  label: 'Ruído branco', emoji: '〰️' },
]

// ── Pomodoro Panel ─────────────────────────────────────────
function PomodoroPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase]           = useState<PomodoroPhase>('focus')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning]       = useState(false)
  const [sessions, setSessions]     = useState(0)
  const [customMins, setCustomMins] = useState<Record<PomodoroPhase, number>>({
    'focus': 25, 'short-break': 5, 'long-break': 15,
  })
  const [sound, setSound]           = useState('none')
  const [muted, setMuted]           = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cfg = PHASE_CONFIG[phase]

  const totalSeconds = customMins[phase] * 60
  const pct = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  const reset = useCallback(() => {
    setRunning(false)
    setSecondsLeft(customMins[phase] * 60)
  }, [phase, customMins])

  useEffect(() => { reset() }, [phase, customMins])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (!muted) {
              // Simple beep via AudioContext
              try {
                const ctx = new AudioContext()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.frequency.setValueAtTime(880, ctx.currentTime)
                osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
                gain.gain.setValueAtTime(0.3, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
                osc.start(); osc.stop(ctx.currentTime + 0.6)
              } catch {}
            }
            if (phase === 'focus') {
              setSessions(n => n + 1)
              // Auto-advance: after 4 sessions → long break
              setPhase(prev => (sessions + 1) % 4 === 0 ? 'long-break' : 'short-break')
            } else {
              setPhase('focus')
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, muted, phase, sessions])

  const radius = 54
  const circ   = 2 * Math.PI * radius
  const dash   = circ - (pct / 100) * circ

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
          <Timer size={15} style={{ color: cfg.color }} /> Pomodoro
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
          <X size={13} />
        </button>
      </div>

      {/* Phase selector */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-base)' }}>
        {(Object.keys(PHASE_CONFIG) as PomodoroPhase[]).map(p => (
          <button key={p} onClick={() => setPhase(p)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: phase === p ? PHASE_CONFIG[p].color + '22' : 'transparent',
                    color: phase === p ? PHASE_CONFIG[p].color : 'var(--text-muted)',
                    border: phase === p ? `1px solid ${PHASE_CONFIG[p].color}44` : '1px solid transparent',
                  }}>
            {PHASE_CONFIG[p].emoji}
          </button>
        ))}
      </div>

      {/* SVG circle timer */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r={radius} fill="none"
                    stroke="var(--border)" strokeWidth="6" />
            <circle cx="70" cy="70" r={radius} fill="none"
                    stroke={cfg.color} strokeWidth="6"
                    strokeDasharray={circ} strokeDashoffset={dash}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display font-bold text-2xl leading-none"
               style={{ color: 'var(--text-primary)' }}>{mins}:{secs}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: cfg.color }}>{cfg.emoji} {cfg.label}</p>
          </div>
        </div>

        {/* Sessions dots */}
        <div className="flex gap-1.5 mt-2">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
                 style={{ background: i < (sessions % 4) ? '#ef4444' : 'var(--border)', boxShadow: i < (sessions % 4) ? '0 0 6px #ef4444aa' : 'none' }} />
          ))}
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>{Math.floor(sessions / 4)} ciclos</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setRunning(r => !r)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: cfg.color, color: '#fff', boxShadow: `0 4px 16px ${cfg.color}44` }}>
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button onClick={reset}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <RotateCcw size={14} />
        </button>
        <button onClick={() => setMuted(m => !m)}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-elevated)', color: muted ? 'var(--text-muted)' : 'var(--accent-3)' }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {/* Custom durations */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(Object.keys(PHASE_CONFIG) as PomodoroPhase[]).map(p => (
          <div key={p}>
            <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block"
                   style={{ color: PHASE_CONFIG[p].color + 'cc' }}>
              {PHASE_CONFIG[p].emoji} min
            </label>
            <input type="number" min="1" max="90"
                   value={customMins[p]}
                   onChange={e => setCustomMins(m => ({ ...m, [p]: parseInt(e.target.value) || 1 }))}
                   className="input text-xs py-1.5 text-center" style={{ padding: '6px 4px' }} />
          </div>
        ))}
      </div>

      {/* Ambient sounds */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2"
           style={{ color: 'var(--text-muted)' }}>Som ambiente</p>
        <div className="grid grid-cols-3 gap-1">
          {AMBIENT_SOUNDS.map(s => (
            <button key={s.id} onClick={() => setSound(s.id)}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] transition-all"
                    style={{
                      background: sound === s.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      border: sound === s.id ? '1px solid var(--accent-1)' : '1px solid var(--border)',
                      color: sound === s.id ? 'var(--accent-3)' : 'var(--text-muted)',
                    }}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Focus Mode Panel ───────────────────────────────────────
function FocusModePanel({ onClose }: { onClose: () => void }) {
  const [goals, setGoals]     = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('study-goals') ?? '[]') } catch { return [] }
  })
  const [newGoal, setNewGoal] = useState('')
  const [done, setDone]       = useState<Set<number>>(new Set())

  const addGoal = () => {
    if (!newGoal.trim()) return
    const updated = [...goals, newGoal.trim()]
    setGoals(updated)
    localStorage.setItem('study-goals', JSON.stringify(updated))
    setNewGoal('')
  }
  const removeGoal = (i: number) => {
    const updated = goals.filter((_, idx) => idx !== i)
    setGoals(updated)
    localStorage.setItem('study-goals', JSON.stringify(updated))
    setDone(d => { const n = new Set(d); n.delete(i); return n })
  }
  const toggleDone = (i: number) => {
    setDone(d => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
          <Target size={15} style={{ color: 'var(--accent-3)' }} /> Metas de estudo
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
          <X size={13} />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input className="input text-sm flex-1 py-2" placeholder="Nova meta..."
               value={newGoal} onChange={e => setNewGoal(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && addGoal()} />
        <button onClick={addGoal}
                className="btn-primary text-xs px-3 py-2 flex items-center gap-1">
          <Zap size={12} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {goals.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Nenhuma meta. Adicione uma acima ↑
          </p>
        )}
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', opacity: done.has(i) ? 0.6 : 1 }}>
            <button onClick={() => toggleDone(i)}
                    className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: done.has(i) ? '#22c55e22' : 'var(--border)', border: `1px solid ${done.has(i) ? '#22c55e' : 'var(--border-light)'}` }}>
              {done.has(i) && <Check size={10} style={{ color: '#22c55e' }} />}
            </button>
            <span className="flex-1 text-xs" style={{ color: 'var(--text-primary)', textDecoration: done.has(i) ? 'line-through' : 'none' }}>
              {g}
            </span>
            <button onClick={() => removeGoal(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}>
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {goals.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{done.size}/{goals.length} concluídas</span>
            <div className="flex-1 mx-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(done.size / goals.length) * 100}%`, background: '#22c55e' }} />
            </div>
            <span>{Math.round((done.size / goals.length) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Study Mode Button (sidebar widget) ───────────────────────
export default function StudyMode() {
  const [open, setOpen]           = useState(false)
  const [activePanel, setPanel]   = useState<'pomodoro'|'focus'|null>(null)
  const [isStudying, setStudying] = useState(false)
  const [panelPos, setPanelPos]   = useState({ top: 0, left: 0 })
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const panelRef = useRef<HTMLDivElement>(null)

  const panels = [
    { id: 'pomodoro' as const, label: 'Pomodoro', icon: Timer,  color: '#ef4444', desc: 'Timer de foco' },
    { id: 'focus'    as const, label: 'Metas',    icon: Target, color: '#a855f7', desc: 'Lista de objetivos' },
  ]

  // Close panel on outside click
  useEffect(() => {
    if (!activePanel) return
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          !Object.values(btnRefs.current).some(b => b?.contains(e.target as Node))) {
        setPanel(null)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [activePanel])

  const handlePanel = (id: 'pomodoro' | 'focus') => {
    if (activePanel === id) { setPanel(null); return }
    // Calculate position based on button location
    const btn = btnRefs.current[id]
    if (btn) {
      const r = btn.getBoundingClientRect()
      const estimatedH = id === 'pomodoro' ? 560 : 260
      const idealTop = r.top + r.height / 2 - estimatedH / 2 - (id === 'focus' ? 80 : 0)
      const top = Math.max(8, Math.min(idealTop, window.innerHeight - estimatedH - 8))
      setPanelPos({ top, left: r.right + 8 })
    }
    setPanel(id)
  }

  return (
    <div className="px-3 pb-3">
      {/* Fixed panel — renders outside sidebar via portal-like fixed positioning */}
      {activePanel && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-[998]" onClick={() => setPanel(null)} />
          <div ref={panelRef}
               className="animate-in"
               style={{
                 position: 'fixed',
                 top: panelPos.top,
                 left: panelPos.left,
                 width: 340,
                 maxHeight: 'calc(100dvh - 16px)',
                 overflowY: 'auto',
                 zIndex: 999,
                 background: 'var(--bg-card)',
                 border: '1px solid var(--border)',
                 borderRadius: 16,
                 boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                 padding: 12,
               }}>
            {activePanel === 'pomodoro' && <PomodoroPanel onClose={() => setPanel(null)} />}
            {activePanel === 'focus'    && <FocusModePanel onClose={() => setPanel(null)} />}
          </div>
        </>
      )}

      {/* Main study mode toggle button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) setStudying(true) }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
        style={{
          background: isStudying && open
            ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(168,85,247,0.15))'
            : 'var(--bg-elevated)',
          border: isStudying && open
            ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid var(--border)',
          color: isStudying && open ? '#f87171' : 'var(--text-secondary)',
        }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
             style={{
               background: isStudying && open ? 'rgba(239,68,68,0.2)' : 'var(--border)',
               border: isStudying && open ? '1px solid rgba(239,68,68,0.4)' : 'none',
             }}>
          <Brain size={13} style={{ color: isStudying && open ? '#f87171' : 'var(--text-muted)' }} />
        </div>
        <span className="flex-1 text-left">Modo Estudo</span>
        {isStudying && open && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
            ATIVO
          </span>
        )}
        <ChevronDown size={12}
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {/* Expanded: sub-tool buttons */}
      {open && (
        <div className="mt-2 space-y-1 animate-in">
          {panels.map(p => (
            <button
              key={p.id}
              ref={el => { btnRefs.current[p.id] = el }}
              onClick={() => handlePanel(p.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activePanel === p.id ? p.color + '18' : 'transparent',
                border: activePanel === p.id ? `1px solid ${p.color}40` : '1px solid transparent',
                color: activePanel === p.id ? p.color : 'var(--text-secondary)',
              }}>
              <p.icon size={13} />
              <span className="flex-1 text-left">{p.label}</span>
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.desc}</span>
              <ChevronRight size={11}
                style={{ color: 'var(--text-muted)', transform: activePanel === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          ))}

          {/* Quit study mode */}
          <button
            onClick={() => { setOpen(false); setStudying(false); setPanel(null) }}
            className="w-full text-[10px] text-center py-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            Encerrar modo estudo
          </button>
        </div>
      )}
    </div>
  )
}
