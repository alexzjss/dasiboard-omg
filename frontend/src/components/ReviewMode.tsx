// ── Modo Revisão — Pomodoro + Flashcards gerados das notas ────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check, RotateCcw, Zap, Brain, Trophy, Users, Copy, LogIn, LogOut } from 'lucide-react'
import { recordStudyEvent } from '@/hooks/useStudyStats'
import { useStudyRoom, generateRoomCode } from '@/hooks/useStudyRoom'
import { useTheme } from '@/context/ThemeContext'
import { useAuthStore } from '@/store/authStore'
import { Flashcard, createReviewSession } from '@/hooks/useNotes'

// ── Pomodoro sub-component ────────────────────────────────────────────────────
function PomodoroBar({ subjectName, onDone }: { subjectName: string; onDone: () => void }) {
  const [mins, setMins]         = useState(25)
  const [secsLeft, setSecsLeft] = useState(25 * 60)
  const [running, setRunning]   = useState(false)
  const [phase, setPhase]       = useState<'work' | 'break'>('work')
  const interval                = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = mins * 60
  const pct   = ((total - secsLeft) / total) * 100
  const mm    = String(Math.floor(secsLeft / 60)).padStart(2, '0')
  const ss    = String(secsLeft % 60).padStart(2, '0')

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        setSecsLeft(s => {
          if (s <= 1) {
            clearInterval(interval.current!)
            setRunning(false)
            if (phase === 'work') { setPhase('break'); setMins(5); setSecsLeft(5 * 60) }
            else { setPhase('work'); setMins(25); setSecsLeft(25 * 60); onDone() }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else if (interval.current) clearInterval(interval.current)
    return () => { if (interval.current) clearInterval(interval.current) }
  }, [running, phase, onDone])

  const reset = () => { setRunning(false); setSecsLeft(mins * 60) }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.9" fill="none"
            stroke={phase === 'work' ? '#ef4444' : '#22c55e'} strokeWidth="2.5"
            strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="0"
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
          {phase === 'work' ? '🎯' : '☕'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
          {phase === 'work' ? `Estudando — ${subjectName}` : 'Pausa curta'}
        </p>
        <p className="text-base font-bold font-mono leading-none" style={{ color: 'var(--text-primary)' }}>{mm}:{ss}</p>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <RotateCcw size={11} />
        </button>
        <button type="button" onClick={() => setRunning(v => !v)} className="h-7 px-3 rounded-lg text-xs font-semibold transition-all" style={{ background: running ? 'rgba(239,68,68,0.15)' : 'var(--gradient-btn)', color: running ? '#ef4444' : 'white', border: running ? '1px solid rgba(239,68,68,0.3)' : 'none' }}>
          {running ? 'Pausar' : 'Iniciar'}
        </button>
      </div>
    </div>
  )
}

// ── Flashcard flip card ────────────────────────────────────────────────────────
function FlipCard({ card, onCorrect, onWrong }: {
  card: Flashcard
  onCorrect: () => void
  onWrong: () => void
}) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => { setFlipped(false) }, [card.id])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card */}
      <div
        onClick={() => setFlipped(v => !v)}
        className="w-full cursor-pointer select-none"
        style={{ perspective: 1000 }}
      >
        <div style={{
          position: 'relative', width: '100%', paddingBottom: '56.25%',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 20, padding: '24px 28px',
            background: 'var(--bg-card)', border: '2px solid var(--border)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--text-muted)' }}>Pergunta</p>
            <p className="text-center font-display font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'clamp(14px, 3vw, 20px)', lineHeight: 1.4 }}>
              {card.front}
            </p>
            <p className="text-[10px] mt-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Toque para revelar →</p>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 20, padding: '24px 28px',
            background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
            border: '2px solid var(--accent-1)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            transform: 'rotateY(180deg)',
            boxShadow: '0 8px 32px var(--accent-glow)',
          }}>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--accent-3)' }}>Resposta</p>
            <p className="text-center font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'clamp(13px, 2.5vw, 18px)', lineHeight: 1.5 }}>
              {card.back}
            </p>
          </div>
        </div>
      </div>

      {/* Answer buttons — only show when flipped */}
      <div className={`flex gap-3 w-full transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button type="button" onClick={onWrong} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.97]" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          <X size={16} /> Errei
        </button>
        <button type="button" onClick={onCorrect} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.97]" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Check size={16} /> Acertei
        </button>
      </div>
    </div>
  )
}

// ── Review Mode modal ─────────────────────────────────────────────────────────
export default function ReviewMode({ subjectName, cards, onClose, subjectId }: {
  subjectName: string
  subjectId?: string
  cards: Flashcard[]
  onClose: () => void
}) {
  const [session]  = useState(() => createReviewSession(cards))
  const [idx, setIdx]         = useState(0)
  const [correct, setCorrect] = useState<string[]>([])
  const [wrong, setWrong]     = useState<string[]>([])
  const [done, setDone]       = useState(false)
  const [pomoDone, setPomoDone] = useState(0)
  const [showRoom, setShowRoom] = useState(false)
  const [roomInput, setRoomInput] = useState('')

  const { theme } = useTheme()
  const user = useAuthStore(s => s.user)
  const myName = user?.full_name?.split(' ')[0] ?? 'Eu'

  const room = useStudyRoom(myName)
  const isGameTheme = ['dark-dlc'].includes(theme.id)

  const card = session[idx]

  const next = useCallback(() => {
    if (idx >= session.length - 1) setDone(true)
    else setIdx(i => i + 1)
    room.updateProgress(idx + 1, correct.length, session.length)
  }, [idx, session.length, correct.length, room])

  const onCorrect = () => {
    recordStudyEvent({ type: 'flashcard_answered', correct: true })
    setCorrect(p => [...p, card.id]); next()
  }
  const onWrong = () => {
    recordStudyEvent({ type: 'flashcard_answered', correct: false })
    setWrong(p => [...p, card.id]); next()
  }

  const restart = () => { setIdx(0); setCorrect([]); setWrong([]); setDone(false) }

  const score = correct.length
  const total = session.length
  const pct   = total ? Math.round((score / total) * 100) : 0

  // Record stats on completion
  useEffect(() => {
    if (!done || total === 0) return
    recordStudyEvent({ type: 'high_score', subjectId: subjectName, pct })
    // Save high score to localStorage for pixel/720/etc themes
    if (isGameTheme) {
      const key = 'dasiboard-hs-' + subjectName.replace(/\s+/g, '-').toLowerCase()
      const prev = parseInt(localStorage.getItem(key) ?? '0', 10)
      if (pct > prev) localStorage.setItem(key, String(pct))
    }
  }, [done])

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Brain size={16} style={{ color: 'var(--accent-3)' }} />
            <div>
              <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Modo Revisão</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{subjectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!done && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {idx + 1}/{total}
              </span>
            )}
            <button type="button" onClick={() => setShowRoom(v => !v)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: room.connected ? 'var(--accent-soft)' : 'var(--bg-elevated)', color: room.connected ? 'var(--accent-3)' : 'var(--text-muted)', border: `1px solid ${room.connected ? 'var(--accent-1)' : 'var(--border)'}` }}
                    title="Sala de estudos">
              <Users size={14} />
            </button>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Study room panel */}
          {showRoom && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Users size={13} style={{ color: 'var(--accent-3)' }}/> Sala de estudos
                </p>
                {room.connected && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                      {room.roomCode}
                    </span>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(room.roomCode ?? ''); }}
                            className="w-6 h-6 rounded flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                      <Copy size={11}/>
                    </button>
                    <button type="button" onClick={room.leave}
                            className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#f87171' }}>
                      <LogOut size={11}/>
                    </button>
                  </div>
                )}
              </div>

              {!room.connected ? (
                <div className="space-y-2">
                  <button type="button" onClick={() => { const code = generateRoomCode(); room.join(code) }}
                          className="w-full btn-primary text-xs justify-center gap-1.5">
                    <Zap size={12}/> Criar sala
                  </button>
                  <div className="flex gap-2">
                    <input type="text" value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())}
                           placeholder="Código da sala..." maxLength={6}
                           className="input text-xs flex-1 font-mono"
                           onKeyDown={e => e.key === 'Enter' && roomInput.length >= 4 && room.join(roomInput)}/>
                    <button type="button" onClick={() => room.join(roomInput)} disabled={roomInput.length < 4}
                            className="btn-ghost text-xs px-3 gap-1 disabled:opacity-40">
                      <LogIn size={12}/> Entrar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {room.peers.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Aguardando colegas… compartilhe o código!</p>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Self */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-3)' }}/>
                        <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{myName} (você)</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}/{total}</span>
                      </div>
                      {room.peers.map(peer => (
                        <div key={peer.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#22c55e' }}/>
                          <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{peer.name}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{peer.cardIndex}/{total}</span>
                          {peer.total > 0 && (
                            <span className="text-xs font-bold" style={{ color: peer.correct/peer.total >= 0.7 ? '#22c55e' : 'var(--text-muted)' }}>
                              {Math.round((peer.correct/peer.total)*100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pomodoro bar */}
          <PomodoroBar subjectName={subjectName} onDone={() => { setPomoDone(p => p + 1); recordStudyEvent({ type: 'pomodoro_completed', minutes: 25 }) }} />

          {pomoDone > 0 && (
            <p className="text-xs text-center" style={{ color: '#22c55e' }}>
              🎉 {pomoDone} pomodoro{pomoDone !== 1 ? 's' : ''} concluído{pomoDone !== 1 ? 's' : ''}!
            </p>
          )}

          {/* Progress bar */}
          {!done && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                   style={{ width: `${(idx / total) * 100}%`, background: 'var(--gradient-btn)' }} />
            </div>
          )}

          {/* Flashcard or results */}
          {!done ? (
            <FlipCard card={card} onCorrect={onCorrect} onWrong={onWrong} />
          ) : (
            <div className="text-center py-4 space-y-4">
              <div>
                <span style={{ fontSize: 56 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '📚' : '💪'}</span>
              </div>
              <div>
                <p className="font-display text-2xl font-bold" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {pct}%
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {score}/{total} corretos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{score}</p>
                  <p className="text-xs" style={{ color: '#22c55e', opacity: 0.7 }}>Acertos</p>
                </div>
                <div className="rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xl font-bold" style={{ color: '#ef4444' }}>{wrong.length}</p>
                  <p className="text-xs" style={{ color: '#ef4444', opacity: 0.7 }}>Erros</p>
                </div>
              </div>

              {/* High score for game themes */}
              {isGameTheme && (() => {
                const key = 'dasiboard-hs-' + subjectName.replace(/\s+/g, '-').toLowerCase()
                const hs = parseInt(localStorage.getItem(key) ?? '0', 10)
                return pct >= hs && pct > 0 ? (
                  <div className="text-center py-2 rounded-xl animate-in"
                       style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>⭐ NOVO RECORDE! {pct}%</p>
                  </div>
                ) : hs > 0 ? (
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Recorde: {hs}%</p>
                ) : null
              })()}

              <div className="flex gap-2">
                <button type="button" onClick={restart} className="flex-1 btn-ghost gap-2 justify-center">
                  <RotateCcw size={14} /> Refazer
                </button>
                <button type="button" onClick={onClose} className="flex-1 btn-primary gap-2 justify-center">
                  <Check size={14} /> Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
