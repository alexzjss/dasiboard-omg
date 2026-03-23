// ── Study Mode Sidebar Widget — launches Study Room overlay ───────────────────
import { useState } from 'react'
import { Brain, BookOpen, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStudyStats } from '@/hooks/useStudyStats'

export default function StudyMode() {
  const [open, setOpen]   = useState(false)
  const navigate          = useNavigate()
  const stats             = useStudyStats()
  const pomodorosToday    = Math.floor(stats.pomodoroMinutes / 25)

  const openRoom = () => navigate('/study')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: 'var(--border)' }}>
          <Brain size={13} style={{ color: 'var(--text-muted)' }}/>
        </div>
        <span className="flex-1 text-left">Modo Estudo</span>
        {stats.streak > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
            🔥{stats.streak}d
          </span>
        )}
        <ChevronDown size={12} style={{ color:'var(--text-muted)', transform: open?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}/>
      </button>

      {open && (
        <div className="mt-2 space-y-1 animate-in">
          {/* Quick stats */}
          {(pomodorosToday > 0 || stats.flashcardsAnswered > 0) && (
            <div className="px-3 py-2 rounded-xl text-[10px] space-y-1"
                 style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
              {pomodorosToday > 0 && <p style={{ color:'var(--text-muted)' }}>🎯 {pomodorosToday} pomodoro{pomodorosToday!==1?'s':''} hoje</p>}
              {stats.flashcardsAnswered > 0 && <p style={{ color:'var(--text-muted)' }}>⚡ {stats.flashcardsAnswered} flashcards total</p>}
            </div>
          )}

          {/* Main CTA */}
          <button
            onClick={openRoom}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(168,85,247,0.12))',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
            }}>
            <BookOpen size={14}/>
            <span className="flex-1 text-left">Abrir Study Room</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background:'rgba(239,68,68,0.2)', color:'#f87171' }}>
              NOVO
            </span>
          </button>
          <p className="text-[9px] text-center px-2" style={{ color:'var(--text-muted)' }}>
            Pomodoro · Flashcards · Metas
          </p>
        </div>
      )}
    </div>
  )
}
