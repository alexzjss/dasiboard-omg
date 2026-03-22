// ── Study Room — Dedicated study overlay with Pomodoro, Notes, Flashcards, Goals ──
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Timer, Brain, Target, Zap, X, Play, Pause, RotateCcw,
  Volume2, VolumeX, Check, Plus, Trash2, FileText,
  ChevronRight, Trophy, BookOpen, Users, Copy, LogIn, LogOut,
  Flame, BarChart3, ArrowLeft, Maximize2, Minimize2,
} from 'lucide-react'
import { useNotes, generateFlashcards, Flashcard, createReviewSession } from '@/hooks/useNotes'
import { useStudyStats, recordStudyEvent } from '@/hooks/useStudyStats'
import { useStudyRoom, generateRoomCode } from '@/hooks/useStudyRoom'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type PomodoroPhase = 'focus' | 'short-break' | 'long-break'
type StudyTab = 'pomodoro' | 'flashcards' | 'notes' | 'goals' | 'room'

const PHASE_CONFIG: Record<PomodoroPhase, { label: string; minutes: number; color: string; emoji: string }> = {
  'focus':       { label: 'Foco',        minutes: 25, color: '#ef4444', emoji: '🎯' },
  'short-break': { label: 'Pausa curta', minutes: 5,  color: '#22c55e', emoji: '☕' },
  'long-break':  { label: 'Pausa longa', minutes: 15, color: '#3b82f6', emoji: '🌿' },
}
const AMBIENT_SOUNDS = [
  { id: 'none',   label: 'Silêncio',     emoji: '🔇' },
  { id: 'rain',   label: 'Chuva',        emoji: '🌧️' },
  { id: 'cafe',   label: 'Café',         emoji: '☕' },
  { id: 'forest', label: 'Floresta',     emoji: '🌲' },
  { id: 'waves',  label: 'Ondas',        emoji: '🌊' },
  { id: 'white',  label: 'Ruído branco', emoji: '〰️' },
]

// ── Beep util ─────────────────────────────────────────────────────────────────
function beep(freq = 880) {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(); osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

// ── Pomodoro Tab ──────────────────────────────────────────────────────────────
function PomodoroTab({ subjectName }: { subjectName: string }) {
  const [phase, setPhase]         = useState<PomodoroPhase>('focus')
  const [secondsLeft, setSecsLeft]= useState(25 * 60)
  const [running, setRunning]     = useState(false)
  const [sessions, setSessions]   = useState(0)
  const [muted, setMuted]         = useState(false)
  const [sound, setSound]         = useState('none')
  const [customMins, setCustom]   = useState<Record<PomodoroPhase, number>>({ focus:25,'short-break':5,'long-break':15 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cfg = PHASE_CONFIG[phase]
  const total = customMins[phase] * 60
  const pct   = ((total - secondsLeft) / total) * 100
  const mm    = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss    = String(secondsLeft % 60).padStart(2, '0')
  const R = 70, C = 2 * Math.PI * R

  const reset = useCallback(() => { setRunning(false); setSecsLeft(customMins[phase] * 60) }, [phase, customMins])
  useEffect(() => { reset() }, [phase, customMins])

  // Title bar timer
  useEffect(() => {
    if (running) document.title = `${mm}:${ss} ${cfg.emoji} DaSIboard`
    else document.title = 'DaSIboard — SI EACH USP'
    return () => { document.title = 'DaSIboard — SI EACH USP' }
  }, [running, mm, ss])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          if (!muted) beep(phase === 'focus' ? 880 : 660)
          if (phase === 'focus') {
            const ns = sessions + 1; setSessions(ns)
            recordStudyEvent({ type: 'pomodoro_completed', minutes: customMins.focus })
            setPhase(ns % 4 === 0 ? 'long-break' : 'short-break')
          } else { setPhase('focus') }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, muted, phase, sessions, customMins])

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Phase tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl w-full max-w-xs" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
        {(Object.keys(PHASE_CONFIG) as PomodoroPhase[]).map(p => (
          <button key={p} onClick={() => setPhase(p)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: phase===p ? PHASE_CONFIG[p].color+'22' : 'transparent', color: phase===p ? PHASE_CONFIG[p].color : 'var(--text-muted)', border: phase===p ? `1px solid ${PHASE_CONFIG[p].color}44` : '1px solid transparent' }}>
            {PHASE_CONFIG[p].emoji}
          </button>
        ))}
      </div>

      {/* Big SVG timer */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--border)" strokeWidth="8"/>
          <circle cx="100" cy="100" r={R} fill="none" stroke={cfg.color} strokeWidth="8"
                  strokeDasharray={C} strokeDashoffset={C - (pct/100)*C}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease', filter: `drop-shadow(0 0 8px ${cfg.color}66)` }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <p className="font-display font-bold text-4xl leading-none" style={{ color: 'var(--text-primary)' }}>{mm}:{ss}</p>
          <p className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.emoji} {cfg.label}</p>
          {subjectName && <p className="text-[10px] mt-1 truncate max-w-[140px] text-center" style={{ color: 'var(--text-muted)' }}>{subjectName}</p>}
        </div>
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
                 style={{ background: i<(sessions%4) ? '#ef4444' : 'var(--border)', boxShadow: i<(sessions%4) ? '0 0 8px #ef4444' : 'none' }}/>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.floor(sessions/4)} ciclos completos</span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 w-full max-w-xs">
        <button onClick={() => setRunning(r=>!r)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: cfg.color, color: '#fff', boxShadow: `0 4px 20px ${cfg.color}44` }}>
          {running ? <Pause size={16}/> : <Play size={16}/>}
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button onClick={reset} className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <RotateCcw size={15}/>
        </button>
        <button onClick={() => setMuted(m=>!m)} className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: muted ? 'var(--text-muted)' : 'var(--accent-3)' }}>
          {muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}
        </button>
      </div>

      {/* Custom durations */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {(Object.keys(PHASE_CONFIG) as PomodoroPhase[]).map(p => (
          <div key={p}>
            <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: PHASE_CONFIG[p].color+'cc' }}>{PHASE_CONFIG[p].emoji} min</label>
            <input type="number" min={1} max={90} value={customMins[p]}
                   onChange={e => setCustom(m => ({ ...m, [p]: parseInt(e.target.value)||1 }))}
                   className="input text-xs text-center py-1.5"/>
          </div>
        ))}
      </div>

      {/* Ambient sounds */}
      <div className="w-full max-w-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Som ambiente</p>
        <div className="grid grid-cols-3 gap-1.5">
          {AMBIENT_SOUNDS.map(s => (
            <button key={s.id} onClick={() => setSound(s.id)}
                    className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[9px] transition-all"
                    style={{ background: sound===s.id ? 'var(--accent-soft)' : 'var(--bg-elevated)', border: sound===s.id ? '1px solid var(--accent-1)' : '1px solid var(--border)', color: sound===s.id ? 'var(--accent-3)' : 'var(--text-muted)' }}>
              <span style={{ fontSize: 18 }}>{s.emoji}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Goals Tab ─────────────────────────────────────────────────────────────────
function GoalsTab() {
  const [goals, setGoals]   = useState<{ text: string; done: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem('study-goals-v2') ?? '[]') } catch { return [] }
  })
  const [input, setInput]   = useState('')
  const persist = (g: typeof goals) => { setGoals(g); localStorage.setItem('study-goals-v2', JSON.stringify(g)) }
  const add    = () => { if (!input.trim()) return; persist([...goals, { text: input.trim(), done: false }]); setInput('') }
  const toggle = (i: number) => persist(goals.map((g,idx) => idx===i ? {...g, done:!g.done} : g))
  const remove = (i: number) => persist(goals.filter((_,idx) => idx!==i))
  const pct    = goals.length ? Math.round((goals.filter(g=>g.done).length / goals.length)*100) : 0

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex gap-2">
        <input className="input text-sm flex-1" placeholder="Adicionar meta de estudo..."
               value={input} onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key==='Enter' && add()}/>
        <button onClick={add} className="btn-primary px-4 py-2.5 text-xs gap-1"><Plus size={13}/></button>
      </div>

      {goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{goals.filter(g=>g.done).length}/{goals.length} metas</span>
            <span className="text-xs font-bold" style={{ color: pct===100 ? '#22c55e' : 'var(--accent-3)' }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct===100 ? '#22c55e' : 'var(--gradient-btn)' }}/>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {goals.length===0 && (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            <Target size={32} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm">Nenhuma meta ainda</p>
            <p className="text-xs mt-1">Defina o que quer revisar hoje</p>
          </div>
        )}
        {goals.map((g,i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl group transition-all"
               style={{ background: g.done ? 'rgba(34,197,94,0.08)' : 'var(--bg-elevated)', border: `1px solid ${g.done ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`, opacity: g.done ? 0.8 : 1 }}>
            <button onClick={() => toggle(i)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: g.done ? '#22c55e22' : 'var(--border)', border: `1px solid ${g.done ? '#22c55e' : 'var(--border-light)'}` }}>
              {g.done && <Check size={11} style={{ color: '#22c55e' }}/>}
            </button>
            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)', textDecoration: g.done ? 'line-through' : 'none', textDecorationColor: '#22c55e' }}>{g.text}</span>
            <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Flashcards Tab ────────────────────────────────────────────────────────────
function FlashcardsTab({ subjects }: { subjects: { id: string; name: string; code: string; color: string }[] }) {
  const { getAllFlashcards } = useNotes()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [cards, setCards]   = useState<Flashcard[]>([])
  const [index, setIndex]   = useState(0)
  const [flipped, setFlipped]= useState(false)
  const [correct, setCorrect]= useState(0)
  const [wrong, setWrong]   = useState(0)
  const [done, setDone]     = useState(false)

  const startSession = (subjectId: string) => {
    const allCards = getAllFlashcards(subjectId)
    if (allCards.length === 0) return
    setCards(createReviewSession(allCards))
    setSelectedSubject(subjectId)
    setIndex(0); setFlipped(false); setCorrect(0); setWrong(0); setDone(false)
  }

  const answer = (isCorrect: boolean) => {
    recordStudyEvent({ type: 'flashcard_answered', correct: isCorrect })
    if (isCorrect) setCorrect(c=>c+1); else setWrong(w=>w+1)
    if (index + 1 >= cards.length) { setDone(true) }
    else { setIndex(i=>i+1); setFlipped(false) }
  }

  if (!selectedSubject || cards.length === 0) {
    return (
      <div className="py-4">
        <p className="text-xs mb-4 font-semibold" style={{ color: 'var(--text-muted)' }}>Escolha uma disciplina para revisar:</p>
        <div className="space-y-2">
          {subjects.map(s => {
            const count = getAllFlashcards(s.id).length
            return (
              <button key={s.id} onClick={() => count > 0 && startSession(s.id)} disabled={count === 0}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'var(--bg-elevated)', border: `1px solid ${count>0 ? s.color+'44' : 'var(--border)'}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold" style={{ background: s.color+'22', color: s.color }}>{s.code.slice(0,4)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                  <p className="text-[10px]" style={{ color: count>0 ? '#22c55e' : 'var(--text-muted)' }}>
                    {count > 0 ? `${count} flashcard${count!==1?'s':''}` : 'Sem notas com Q:/A:'}
                  </p>
                </div>
                {count > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }}/>}
              </button>
            )
          })}
          {subjects.length === 0 && (
            <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
              <Zap size={32} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Nenhuma disciplina com flashcards</p>
              <p className="text-xs mt-1">Abra Disciplinas e crie notas com Q:/A:</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (done) {
    const total = correct + wrong
    const pct   = total ? Math.round((correct/total)*100) : 0
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl" style={{ background: pct>=70 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
          {pct>=70 ? '🏆' : '💪'}
        </div>
        <div>
          <p className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>{pct}%</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{correct} certas · {wrong} erradas de {total}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => startSession(selectedSubject)} className="btn-primary gap-1.5 text-sm"><RotateCcw size={13}/> Repetir</button>
          <button onClick={() => setSelectedSubject(null)} className="btn-ghost text-sm">Outras</button>
        </div>
      </div>
    )
  }

  const card = cards[index]
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Progress */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          <span>{index+1}/{cards.length}</span>
          <span style={{ color: '#22c55e' }}>{correct} ✓ <span style={{ color: '#ef4444' }}>{wrong} ✗</span></span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${((index)/cards.length)*100}%`, background: 'var(--gradient-btn)' }}/>
        </div>
      </div>

      {/* Flip card */}
      <div onClick={() => setFlipped(v=>!v)} className="w-full max-w-sm cursor-pointer" style={{ perspective: 1000 }}>
        <div style={{ position:'relative', paddingBottom:'60%', transformStyle:'preserve-3d', transform: flipped?'rotateY(180deg)':'rotateY(0)', transition:'transform 0.45s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* Front */}
          <div style={{ position:'absolute', inset:0, backfaceVisibility:'hidden', borderRadius:20, background:'var(--bg-card)', border:'2px solid var(--border)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'24px', boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--text-muted)' }}>Pergunta</p>
            <p className="text-center font-semibold" style={{ color:'var(--text-primary)', fontSize:'clamp(15px,3vw,20px)', lineHeight:1.4 }}>{card.front}</p>
            <p className="text-[10px] mt-4 opacity-50" style={{ color: 'var(--text-muted)' }}>Toque para revelar →</p>
          </div>
          {/* Back */}
          <div style={{ position:'absolute', inset:0, backfaceVisibility:'hidden', borderRadius:20, background:'linear-gradient(135deg,var(--bg-card),var(--bg-elevated))', border:'2px solid var(--accent-1)', transform:'rotateY(180deg)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'24px', boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color:'var(--accent-3)' }}>Resposta</p>
            <p className="text-center font-semibold" style={{ color:'var(--text-primary)', fontSize:'clamp(15px,3vw,20px)', lineHeight:1.4 }}>{card.back}</p>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-3 w-full max-w-sm animate-in">
          <button onClick={() => answer(false)} className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95" style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)' }}>
            ✗ Errei
          </button>
          <button onClick={() => answer(true)} className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95" style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)' }}>
            ✓ Acertei
          </button>
        </div>
      )}
    </div>
  )
}

// ── Stats mini panel ──────────────────────────────────────────────────────────
function StatsBar() {
  const stats = useStudyStats()
  const items = [
    { label: 'Pomodoros', value: Math.floor(stats.pomodoroMinutes/25), icon: '🎯', color: '#ef4444' },
    { label: 'Flashcards', value: stats.flashcardsAnswered, icon: '⚡', color: '#f59e0b' },
    { label: 'Notas',     value: stats.notesCreated, icon: '📝', color: '#3b82f6' },
    { label: 'Streak',   value: stats.streak, icon: '🔥', color: '#f97316', suffix: 'd' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3 shrink-0" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)' }}>
      {items.map(it => (
        <div key={it.label} className="flex flex-col items-center gap-0.5">
          <span style={{ fontSize: 16 }}>{it.icon}</span>
          <span className="font-display font-bold text-sm leading-none" style={{ color: it.color }}>{it.value}{it.suffix??''}</span>
          <span className="text-[9px]" style={{ color:'var(--text-muted)' }}>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Study Room Main Page ──────────────────────────────────────────────────────
export default function StudyRoomPage() {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)
  const [tab, setTab]         = useState<StudyTab>('pomodoro')
  const [subjects, setSubjects]= useState<{ id:string; name:string; code:string; color:string }[]>([])
  const [activeSubject, setActiveSubject] = useState<{ id:string; name:string; code:string; color:string } | null>(null)
  const [zen, setZen]         = useState(false) // hide all chrome

  // Load subjects for context
  useEffect(() => {
    api.get('/grades/subjects').then(r => setSubjects(r.data)).catch(() => {})
  }, [])

  const tabs: { id: StudyTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'pomodoro',   label: 'Pomodoro',   icon: Timer,    color: '#ef4444' },
    { id: 'flashcards', label: 'Flashcards', icon: Zap,      color: '#f59e0b' },
    { id: 'goals',      label: 'Metas',      icon: Target,   color: '#a855f7' },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex flex-col animate-in"
         style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      {!zen && (
        <div className="shrink-0 flex items-center justify-between px-4 py-3 gap-3"
             style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.12), rgba(168,85,247,0.08))', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ef4444,#a855f7)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
              <Brain size={17} color="white"/>
            </div>
            <div>
              <h1 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Study Room</h1>
              {activeSubject ? (
                <p className="text-[10px]" style={{ color: 'var(--accent-3)' }}>📖 {activeSubject.name}</p>
              ) : (
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Modo estudo ativo</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick subject selector */}
            {subjects.length > 0 && (
              <select className="input text-xs py-1.5 max-w-[140px]"
                      value={activeSubject?.id ?? ''}
                      onChange={e => setActiveSubject(subjects.find(s=>s.id===e.target.value)??null)}>
                <option value="">Sem disciplina</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name.slice(0,20)}</option>)}
              </select>
            )}
            <button onClick={() => setZen(z=>!z)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                    style={{ background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--border)' }}
                    title="Modo Zen (tela limpa)">
              {zen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
            </button>
            <button onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <ArrowLeft size={13}/> Sair
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!zen && <StatsBar/>}

      {/* Tabs nav */}
      {!zen && (
        <div className="shrink-0 flex gap-1 px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: tab===t.id ? t.color+'18' : 'transparent', color: tab===t.id ? t.color : 'var(--text-muted)', border: tab===t.id ? `1px solid ${t.color}44` : '1px solid transparent' }}>
              <t.icon size={12}/>
              {t.label}
            </button>
          ))}
          {zen && (
            <button onClick={() => setZen(false)} className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'var(--bg-elevated)', color:'var(--text-muted)' }}>
              <Minimize2 size={13}/>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6" data-no-swipe>
        {tab === 'pomodoro'   && <PomodoroTab subjectName={activeSubject?.name ?? ''}/>}
        {tab === 'flashcards' && <FlashcardsTab subjects={subjects}/>}
        {tab === 'goals'      && <GoalsTab/>}
      </div>

      {/* Zen mode minimal controls */}
      {zen && (
        <div className="shrink-0 flex justify-center gap-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: tab===t.id ? t.color+'22' : 'var(--bg-elevated)', color: tab===t.id ? t.color : 'var(--text-muted)', border: `1px solid ${tab===t.id ? t.color+'44' : 'var(--border)'}` }}>
              <t.icon size={15}/>
            </button>
          ))}
          <button onClick={() => setZen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
            <Minimize2 size={15}/>
          </button>
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'var(--bg-elevated)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' }}>
            <X size={15}/>
          </button>
        </div>
      )}
    </div>
  )
}
