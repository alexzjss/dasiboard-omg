import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BookOpen, KanbanSquare, CalendarDays, Users, User, Clock, Hash, ArrowRight, FileText, Brain, Zap } from 'lucide-react'
import api from '@/utils/api'
import { triggerEasterEgg } from '@/hooks/useEasterEggs'

// ── Result types ──────────────────────────────────────────────────────────────
type ResultKind = 'subject'|'card'|'event'|'entity'|'docente'|'nav'|'note'|'flashcard'

interface SearchResult {
  id: string
  kind: ResultKind
  title: string
  subtitle?: string
  href: string
  color?: string
  score: number
}

const KIND_META: Record<ResultKind, { icon: any; label: string; color: string }> = {
  subject:  { icon: BookOpen,     label: 'Disciplina',  color: '#8b5cf6' },
  card:     { icon: KanbanSquare, label: 'Card',        color: '#3b82f6' },
  event:    { icon: CalendarDays, label: 'Evento',      color: '#f59e0b' },
  entity:   { icon: Users,        label: 'Entidade',    color: '#10b981' },
  docente:  { icon: User,         label: 'Docente',     color: '#ec4899' },
  nav:      { icon: Hash,         label: 'Página',      color: 'var(--accent-3)' },
  note:     { icon: FileText,     label: 'Nota',        color: '#f59e0b' },
  flashcard:{ icon: Brain,        label: 'Flashcard',   color: '#22c55e' },
}

// Static nav pages always in results
const NAV_ITEMS: SearchResult[] = [
  { id:'nav-home',     kind:'nav', title:'Início',      subtitle:'Dashboard principal', href:'/',          score:0 },
  { id:'nav-kanban',   kind:'nav', title:'Kanban',      subtitle:'Quadros e tarefas',   href:'/kanban',    score:0 },
  { id:'nav-grades',   kind:'nav', title:'Disciplinas', subtitle:'Notas e fluxograma',  href:'/grades',    score:0 },
  { id:'nav-calendar', kind:'nav', title:'Calendário',  subtitle:'Eventos e provas',    href:'/calendar',  score:0 },
  { id:'nav-entities', kind:'nav', title:'Entidades',   subtitle:'Grupos do curso',     href:'/entities',  score:0 },
  { id:'nav-docentes', kind:'nav', title:'Docentes',    subtitle:'Professores do SI',   href:'/docentes',  score:0 },
  { id:'nav-profile',  kind:'nav', title:'Perfil',      subtitle:'Seu perfil e cartão', href:'/profile',   score:0 },
]

// ── Fuzzy match score ─────────────────────────────────────────────────────────
function score(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  // Check every word
  const words = q.split(/\s+/)
  if (words.every(w => t.includes(w))) return 50
  // Fuzzy — every char present in order
  let qi = 0
  for (const c of t) { if (c === q[qi]) qi++ }
  return qi === q.length ? 20 : 0
}

// ── Global search hook ────────────────────────────────────────────────────────
let cachedData: {
  subjects: any[]
  cards: any[]
  events: any[]
  entities: any[]
  docentes: any[]
  notes: any[]
  flashcards: any[]
  fetchedAt: number
} | null = null

// Load notes from localStorage (no API needed)
function loadNotesFromStorage() {
  try {
    const raw = localStorage.getItem('dasiboard-notes')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

async function fetchAll() {
  if (cachedData && Date.now() - cachedData.fetchedAt < 60_000) return cachedData

  const [subjects, boards, events, entities, docentes] = await Promise.allSettled([
    api.get('/grades/subjects'),
    api.get('/kanban/boards'),
    api.get('/events/'),
    api.get('/entities/'),
    api.get('/docentes/'),
  ])

  const cards: any[] = []
  if (boards.status === 'fulfilled') {
    for (const board of boards.value.data) {
      try {
        const { data } = await api.get(`/kanban/boards/${board.id}/columns`)
        for (const col of data) {
          for (const card of (col.cards ?? [])) {
            cards.push({ ...card, board_name: board.name })
          }
        }
      } catch {}
    }
  }

  // Load notes from localStorage
  const notesRaw = loadNotesFromStorage()
  const flashcardsRaw: any[] = []
  for (const note of notesRaw) {
    // Parse Q/A patterns from note content
    const lines = (note.content || '').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const qm = lines[i].trim().match(/^[Qq][:：]\s*(.+)/)
      if (qm) {
        for (let j = i+1; j < Math.min(i+5, lines.length); j++) {
          const am = lines[j].trim().match(/^[Aa][:：]\s*(.+)/)
          if (am) { flashcardsRaw.push({ id: note.id+'-'+i, front: qm[1], back: am[1], noteId: note.id, subjectId: note.subjectId }); break }
        }
      }
      const bm = lines[i].trim().match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)/)
      if (bm) flashcardsRaw.push({ id: note.id+'-b-'+i, front: bm[1], back: bm[2], noteId: note.id, subjectId: note.subjectId })
    }
  }

  cachedData = {
    subjects: subjects.status === 'fulfilled' ? subjects.value.data : [],
    cards,
    events:   events.status === 'fulfilled'   ? events.value.data  : [],
    entities: entities.status === 'fulfilled' ? entities.value.data : [],
    docentes: docentes.status === 'fulfilled' ? docentes.value.data : [],
    notes: notesRaw,
    flashcards: flashcardsRaw,
    fetchedAt: Date.now(),
  }
  return cachedData
}

function buildResults(data: typeof cachedData, query: string): SearchResult[] {
  if (!data) return []

  const results: SearchResult[] = []
  const q = query.trim()

  // Nav pages — always shown when empty, filtered when typed
  for (const nav of NAV_ITEMS) {
    const s = q ? Math.max(score(nav.title, q), score(nav.subtitle ?? '', q)) : 5
    if (s > 0 || !q) results.push({ ...nav, score: s || 5 })
  }

  if (!q) return results.sort((a, b) => b.score - a.score).slice(0, 8)

  // Subjects
  for (const s of data.subjects) {
    const sc = Math.max(score(s.name ?? '', q), score(s.code ?? '', q))
    if (sc > 0) results.push({
      id: `subject-${s.id}`,
      kind: 'subject',
      title: s.name,
      subtitle: `${s.code} · ${s.semester}`,
      href: '/grades',
      color: s.color,
      score: sc,
    })
  }

  // Cards
  for (const c of data.cards) {
    const sc = Math.max(score(c.title ?? '', q), score(c.board_name ?? '', q))
    if (sc > 0) results.push({
      id: `card-${c.id}`,
      kind: 'card',
      title: c.title,
      subtitle: `Kanban · ${c.board_name}`,
      href: '/kanban',
      score: sc,
    })
  }

  // Events
  for (const e of data.events) {
    const sc = score(e.title ?? '', q)
    if (sc > 0) results.push({
      id: `event-${e.id}`,
      kind: 'event',
      title: e.title,
      subtitle: e.start_at ? new Date(e.start_at).toLocaleDateString('pt-BR') : undefined,
      href: '/calendar',
      color: e.color,
      score: sc,
    })
  }

  // Entities
  for (const e of data.entities) {
    const sc = Math.max(score(e.name ?? '', q), score(e.description ?? '', q))
    if (sc > 0) results.push({
      id: `entity-${e.id}`,
      kind: 'entity',
      title: e.name,
      subtitle: e.type,
      href: '/entities',
      score: sc,
    })
  }

  // Docentes
  for (const d of data.docentes) {
    const sc = Math.max(score(d.name ?? '', q), score(d.area ?? '', q))
    if (sc > 0) results.push({
      id: `docente-${d.id}`,
      kind: 'docente',
      title: d.name,
      subtitle: d.area,
      href: '/docentes',
      score: sc,
    })
  }

  // Notes
  for (const n of data.notes) {
    const sc = Math.max(score(n.title ?? '', q), score(n.content ?? '', q))
    if (sc > 0) results.push({
      id: `note-${n.id}`,
      kind: 'note',
      title: n.title || 'Nota sem título',
      subtitle: `Nota · ${n.subjectId ? n.subjectId : 'Geral'}`,
      href: '/grades',
      score: sc,
    })
  }

  // Flashcards
  for (const f of data.flashcards) {
    const sc = Math.max(score(f.front ?? '', q), score(f.back ?? '', q))
    if (sc > 0) results.push({
      id: `flashcard-${f.id}`,
      kind: 'flashcard',
      title: f.front,
      subtitle: `Flashcard → ${f.back.slice(0, 60)}${f.back.length > 60 ? '…' : ''}`,
      href: '/grades',
      score: sc + 5, // boost flashcards slightly
    })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
}

// ── Spotlight UI ──────────────────────────────────────────────────────────────
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dataRef  = useRef<typeof cachedData>(null)

  // Load data on mount — also refresh notes cache
  useEffect(() => {
    cachedData = null  // invalidate so notes are always fresh
    setLoading(true)
    fetchAll().then(d => {
      dataRef.current = d
      setResults(buildResults(d, ''))
      setLoading(false)
    }).catch(() => setLoading(false))
    inputRef.current?.focus()
  }, [])

  // Update results on query change
  useEffect(() => {
    setSelected(0)
    setResults(buildResults(dataRef.current, query))
  }, [query])

  const go = useCallback((result: SearchResult) => {
    navigate(result.href)
    onClose()
  }, [navigate, onClose])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) go(results[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected, go, onClose])

  // Group by kind for display
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const g = r.kind === 'nav' ? 'Páginas' : KIND_META[r.kind].label + 's'
    ;(acc[g] ??= []).push(r)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[10dvh] sm:pt-[12dvh] px-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent-3)' }}
            placeholder="Buscar disciplinas, cards, eventos, docentes..."
            value={query}
            onChange={e => {
              const val = e.target.value
              setQuery(val)
              // ── Easter egg keywords ──────────────────────────
              const lower = val.toLowerCase().trim()
              if (lower === 'matrix') {
                localStorage.setItem('dasiboard-easter-found', '1')
                triggerEasterEgg('matrix')
                setQuery('')
              } else if (lower === 'sudo') {
                localStorage.setItem('dasiboard-easter-found', '1')
                triggerEasterEgg('hacker')
                setQuery('')
              } else if (lower === 'hype') {
                localStorage.setItem('dasiboard-easter-found', '1')
                triggerEasterEgg('hype-particles')
                setQuery('')
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="shrink-0"
                    style={{ color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
          )}
          <kbd className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55dvh] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="shimmer w-full h-10 rounded-xl mb-2" />
              <div className="shimmer w-3/4 h-10 rounded-xl mb-2 mx-auto" />
              <div className="shimmer w-5/6 h-10 rounded-xl mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Search size={28} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                     style={{ color: 'var(--text-muted)' }}>
                    {group}
                  </p>
                  {items.map((r) => {
                    const globalIdx = results.indexOf(r)
                    const isSelected = globalIdx === selected
                    const meta = KIND_META[r.kind]
                    const Icon = meta.icon
                    return (
                      <button key={r.id}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                              style={{
                                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                borderLeft: isSelected ? `2px solid var(--accent-1)` : '2px solid transparent',
                              }}
                              onMouseEnter={() => setSelected(globalIdx)}
                              onClick={() => go(r)}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: (r.color ?? meta.color) + '22', border: `1px solid ${(r.color ?? meta.color)}33` }}>
                          <Icon size={14} style={{ color: r.color ?? meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                          {r.subtitle && (
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>
                          )}
                        </div>
                        {isSelected && <ArrowRight size={13} style={{ color: 'var(--accent-3)', flexShrink: 0 }} />}
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          {meta.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center gap-4 text-[10px]"
             style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>↵</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>Esc</kbd> fechar</span>
          <span className="ml-auto flex items-center gap-1">
            <Clock size={10} />
            {loading ? 'buscando...' : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Hook for managing open/close + global Ctrl+K shortcut ────────────────────
export function useGlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
