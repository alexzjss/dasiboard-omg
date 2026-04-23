// ── Modo Pânico de Prova — detecta provas nas próximas 24h ───────────────────
import { useEffect, useState, useRef } from 'react'
import { differenceInSeconds, parseISO, isAfter, isBefore, addHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Zap, Timer, BookOpen } from 'lucide-react'
import api from '@/utils/api'
import { useTheme } from '@/context/ThemeContext'

interface ExamEvent {
  id: string; title: string; start_at: string; event_type: string
}

const PANIC_KEY = 'dasiboard-panic-dismissed'

function pad(n: number) { return String(n).padStart(2, '0') }

export function usePanicMode() {
  const [exams,    setExams]    = useState<ExamEvent[]>([])
  const [active,   setActive]   = useState(false)
  const [panicOn,  setPanicOn]  = useState(false)
  const { setTheme, isDark, accentColor, setAccentColor } = useTheme()
  const prevTheme = useRef<{ themeId: 'custom-dark' | 'custom-light'; accent: string } | null>(null)

  useEffect(() => {
    // Check for exams in next 24h
    const now    = new Date()
    const cutoff = addHours(now, 24)
    api.get('/events/', { params: { start: now.toISOString(), end: cutoff.toISOString() } })
      .then(({ data }) => {
        const upcoming = (data as ExamEvent[]).filter(e => e.event_type === 'exam')
        if (upcoming.length > 0) {
          // Check if dismissed today
          const dismissed = localStorage.getItem(PANIC_KEY)
          const today     = now.toISOString().slice(0, 10)
          if (dismissed !== today) setActive(true)
          setExams(upcoming)
        }
      })
      .catch(() => {})
  }, [])

  const activate = () => {
    setPanicOn(true)
    setActive(false)
    prevTheme.current = { themeId: isDark ? 'custom-dark' : 'custom-light', accent: accentColor }
    setTheme('custom-dark')
    setAccentColor('#dc2626')
  }

  const dismiss = () => {
    setActive(false)
    localStorage.setItem(PANIC_KEY, new Date().toISOString().slice(0, 10))
  }

  const deactivate = () => {
    setPanicOn(false)
    if (prevTheme.current) {
      setTheme(prevTheme.current.themeId)
      setAccentColor(prevTheme.current.accent)
    }
  }

  return { exams, active, panicOn, activate, dismiss, deactivate }
}

export function PanicBanner({ exams, onActivate, onDismiss }: {
  exams: ExamEvent[]; onActivate: () => void; onDismiss: () => void
}) {
  const next = exams[0]
  if (!next) return null

  const [secs, setSecs] = useState(
    Math.max(0, differenceInSeconds(parseISO(next.start_at), new Date()))
  )
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60

  return (
    <div className="fixed top-0 inset-x-0 z-[80] animate-in"
         style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', borderBottom: '2px solid #ef4444' }}>
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Zap size={16} style={{ color: '#fca5a5', animation: 'pulse 1s infinite' }} />
          <span className="text-xs font-bold text-red-100 hidden sm:block">PROVA EM</span>
          <span className="font-display font-bold text-base text-white tabular-nums">
            {pad(h)}:{pad(m)}:{pad(s)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-red-100">{next.title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onActivate}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Zap size={12} /> Modo Pânico
          </button>
          <button onClick={onDismiss}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fca5a5' }}>
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PanicActiveBar({ exams, onDeactivate }: {
  exams: ExamEvent[]; onDeactivate: () => void
}) {
  const next = exams[0]
  if (!next) return null

  const [secs, setSecs] = useState(
    Math.max(0, differenceInSeconds(parseISO(next.start_at), new Date()))
  )
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60

  return (
    <div className="fixed top-0 inset-x-0 z-[80]"
         style={{ background: '#450a0a', borderBottom: '1px solid #7f1d1d' }}>
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Modo Pânico Ativo</span>
        <span className="font-display font-bold text-sm text-white tabular-nums ml-1">
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
        <span className="text-xs text-red-200 flex-1 truncate">{next.title}</span>
        <button onClick={onDeactivate}
                className="text-[10px] text-red-400 hover:text-red-200 transition-colors shrink-0">
          Desativar
        </button>
      </div>
    </div>
  )
}
