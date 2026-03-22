import { useState, useEffect, useRef, useCallback, type ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BookOpen, KanbanSquare, CalendarDays, Users, User, Clock, Hash, ArrowRight, FileText, Brain, Zap } from 'lucide-react'
import api from '@/utils/api'
import { STORAGE_KEYS } from '@/utils/storage'
import { triggerEasterEgg } from '@/hooks/useEasterEggs'

// ── Result types ──────────────────────────────────────────────────────────────
type ResultKind = 'subject'|'card'|'event'|'entity'|'docente'|'nav'|'note'|'flashcard'

interface SearchResult {
  id: string; kind: ResultKind; title: string; subtitle?: string
  href: string; color?: string; score: number
}

const KIND_META: Record<ResultKind, { icon: ElementType; label: string; color: string }> = {
  subject:  { icon: BookOpen,     label: 'Disciplina',  color: '#8b5cf6' },
  card:     { icon: KanbanSquare, label: 'Card',        color: '#3b82f6' },
  event:    { icon: CalendarDays, label: 'Evento',      color: '#f59e0b' },
  entity:   { icon: Users,        label: 'Entidade',    color: '#10b981' },
  docente:  { icon: User,         label: 'Docente',     color: '#ec4899' },
  nav:      { icon: Hash,         label: 'Página',      color: 'var(--accent-3)' },
  note:     { icon: FileText,     label: 'Nota',        color: '#f59e0b' },
  flashcard:{ icon: Brain,        label: 'Flashcard',   color: '#22c55e' },
}

const NAV_ITEMS: SearchResult[] = [
  { id:'nav-home',     kind:'nav', title:'Início',      subtitle:'Dashboard principal', href:'/',          score:0 },
  { id:'nav-kanban',   kind:'nav', title:'Kanban',      subtitle:'Quadros e tarefas',   href:'/kanban',    score:0 },
  { id:'nav-grades',   kind:'nav', title:'Disciplinas', subtitle:'Notas e fluxograma',  href:'/grades',    score:0 },
  { id:'nav-calendar', kind:'nav', title:'Calendário',  subtitle:'Eventos e provas',    href:'/calendar',  score:0 },
  { id:'nav-entities', kind:'nav', title:'Entidades',   subtitle:'Grupos do curso',     href:'/entities',  score:0 },
  { id:'nav-docentes', kind:'nav', title:'Docentes',    subtitle:'Professores do SI',   href:'/docentes',  score:0 },
  { id:'nav-profile',  kind:'nav', title:'Perfil',      subtitle:'Seu perfil e cartão', href:'/profile',   score:0 },
]

function scoreText(text: string, query: string): number {
  const t = text.toLowerCase(), q = query.toLowerCase().trim()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  if (q.split(/\s+/).every(w => t.includes(w))) return 50
  let qi = 0
  for (const c of t) { if (c === q[qi]) qi++ }
  return qi === q.length ? 20 : 0
}

// ── Module-level cache — shared across renders, invalidated on open ───────────
let cachedData: {
  subjects: any[]; cards: any[]; events: any[]; entities: any[]; docentes: any[]
  notes: any[]; flashcards: any[]; fetchedAt: number
} | null = null

function loadNotesFromStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) ?? '[]') } catch { return [] }
}

// Single fetch with AbortController support
async function fetchAll(signal?: AbortSignal) {
  if (cachedData && Date.now() - cachedData.fetchedAt < 60_000) return cachedData

  const [subjects, boards, events, entities, docentes] = await Promise.allSettled([
    api.get('/grades/subjects', { signal }),
    api.get('/kanban/boards', { signal }),
    api.get('/events/', { signal }),
    api.get('/entities/', { signal }),
    api.get('/docentes/', { signal }),
  ])

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const cards: any[] = []
  if (boards.status === 'fulfilled') {
    for (const board of boards.value.data) {
      try {
        const { data } = await api.get(`/kanban/boards/${board.id}/columns`, { signal })
        for (const col of data) for (const card of (col.cards ?? []))
          cards.push({ ...card, board_name: board.name })
      } catch {}
    }
  }

  const notesRaw = loadNotesFromStorage()
  const flashcardsRaw: any[] = []
  for (const note of notesRaw) {
    const lines = (note.content || '').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const qm = lines[i].trim().match(/^[Qq][:：]\s*(.+)/)
      if (qm) for (let j = i+1; j < Math.min(i+5, lines.length); j++) {
        const am = lines[j].trim().match(/^[Aa][:：]\s*(.+)/)
        if (am) { flashcardsRaw.push({ id: `${note.id}-${i}`, front: qm[1], back: am[1] }); break }
      }
      const bm = lines[i].trim().match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)/)
      if (bm) flashcardsRaw.push({ id: `${note.id}-b-${i}`, front: bm[1], back: bm[2] })
    }
  }

  cachedData = {
    subjects: subjects.status === 'fulfilled' ? subjects.value.data : [],
    cards, events: events.status === 'fulfilled' ? events.value.data : [],
    entities: entities.status === 'fulfilled' ? entities.value.data : [],
    docentes: docentes.status === 'fulfilled' ? docentes.value.data : [],
    notes: notesRaw, flashcards: flashcardsRaw, fetchedAt: Date.now(),
  }
  return cachedData
}

function buildResults(data: typeof cachedData, query: string): SearchResult[] {
  if (!data) return []
  const results: SearchResult[] = []
  const q = query.trim()

  for (const nav of NAV_ITEMS) {
    const s = q ? Math.max(scoreText(nav.title, q), scoreText(nav.subtitle ?? '', q)) : 5
    if (s > 0 || !q) results.push({ ...nav, score: s || 5 })
  }
  if (!q) return results.sort((a, b) => b.score - a.score).slice(0, 8)

  const push = (id: string, kind: ResultKind, title: string, subtitle: string, href: string, sc: number, color?: string) => {
    if (sc > 0) results.push({ id, kind, title, subtitle, href, color, score: sc })
  }

  for (const s of data.subjects)
    push(`subject-${s.id}`, 'subject', s.name, `${s.code} · ${s.semester}`, '/grades',
         Math.max(scoreText(s.name ?? '', q), scoreText(s.code ?? '', q)), s.color)
  for (const c of data.cards)
    push(`card-${c.id}`, 'card', c.title, `Kanban · ${c.board_name}`, '/kanban',
         Math.max(scoreText(c.title ?? '', q), scoreText(c.board_name ?? '', q)))
  for (const e of data.events)
    push(`event-${e.id}`, 'event', e.title,
         e.start_at ? new Date(e.start_at).toLocaleDateString('pt-BR') : '', '/calendar',
         scoreText(e.title ?? '', q), e.color)
  for (const e of data.entities)
    push(`entity-${e.id}`, 'entity', e.name, e.type ?? '', '/entities',
         Math.max(scoreText(e.name ?? '', q), scoreText(e.description ?? '', q)))
  for (const d of data.docentes)
    push(`docente-${d.id}`, 'docente', d.name, d.area ?? '', '/docentes',
         Math.max(scoreText(d.name ?? '', q), scoreText(d.area ?? '', q)))
  for (const n of data.notes)
    push(`note-${n.id}`, 'note', n.title || 'Nota sem título', 'Nota', '/grades',
         Math.max(scoreText(n.title ?? '', q), scoreText(n.content ?? '', q)))
  for (const f of data.flashcards) {
    const sc = Math.max(scoreText(f.front ?? '', q), scoreText(f.back ?? '', q))
    if (sc > 0) results.push({ id: `fc-${f.id}`, kind: 'flashcard', title: f.front,
      subtitle: `Flashcard → ${String(f.back).slice(0, 60)}…`, href: '/grades', score: sc + 5 })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 14)
}

// ── Spotlight UI ──────────────────────────────────────────────────────────────
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const navigate  = useNavigate()
  const [query,   setQuery]    = useState('')
  const [results, setResults]  = useState<SearchResult[]>([])
  const [selected, setSelected]= useState(0)
  const [loading, setLoading]  = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const dataRef   = useRef<typeof cachedData>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef  = useRef<AbortController | null>(null)

  // Load data once on mount
  useEffect(() => {
    cachedData = null // always refresh notes
    setLoading(true)
    abortRef.current = new AbortController()
    fetchAll(abortRef.current.signal)
      .then(d => { dataRef.current = d; setResults(buildResults(d, '')); setLoading(false) })
      .catch(e => { if (e?.name !== 'AbortError') setLoading(false) })
    inputRef.current?.focus()
    return () => abortRef.current?.abort()
  }, [])

  // Debounced result update — 150ms for local search (no API calls)
  const handleQuery = useCallback((val: string) => {
    setQuery(val)
    // Easter egg keywords — immediate
    const lower = val.toLowerCase().trim()
    if (lower === 'matrix' || lower === 'sudo' || lower === 'hype') {
      localStorage.setItem('dasiboard-easter-found', '1')
      triggerEasterEgg(lower === 'matrix' ? 'matrix' : lower === 'sudo' ? 'hacker' : 'hype-particles')
      setQuery(''); return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSelected(0)
      setResults(buildResults(dataRef.current, val))
    }, 120)
  }, [])

  const go = useCallback((result: SearchResult) => { navigate(result.href); onClose() }, [navigate, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)) }
      if (e.key === 'Enter' && results[selected]) go(results[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected, go, onClose])

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const g = r.kind === 'nav' ? 'Páginas' : KIND_META[r.kind].label + 's'
    ;(acc[g] ??= []).push(r); return acc
  }, {})

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-[10dvh] sm:pt-[12dvh] px-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', zIndex: 'var(--z-search, 300)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}
         role="dialog" aria-modal="true" aria-label="Busca global">
      <div className="w-full max-w-xl rounded-2xl overflow-hidden animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox" aria-expanded={results.length > 0} aria-autocomplete="list"
            aria-activedescendant={results[selected] ? `sr-${results[selected].id}` : undefined}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent-3)' }}
            placeholder="Buscar disciplinas, cards, eventos…"
            value={query}
            onChange={e => handleQuery(e.target.value)}
            autoComplete="off" spellCheck={false}
          />
          {query && (
            <button onClick={() => handleQuery('')} aria-label="Limpar busca"
                    style={{ color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
          )}
          <kbd className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
            Esc
          </kbd>
        </div>

        <div className="max-h-[55dvh] overflow-y-auto" role="listbox" aria-label="Resultados da busca">
          {loading ? (
            <div className="px-4 py-8 text-center" aria-live="polite" aria-label="Carregando…">
              <div className="shimmer w-full h-10 rounded-xl mb-2" />
              <div className="shimmer w-3/4 h-10 rounded-xl mb-2 mx-auto" />
              <div className="shimmer w-5/6 h-10 rounded-xl mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Search size={28} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                     style={{ color: 'var(--text-muted)' }} aria-hidden="true">
                    {group}
                  </p>
                  {items.map(r => {
                    const globalIdx = results.indexOf(r)
                    const isSelected = globalIdx === selected
                    const meta = KIND_META[r.kind]
                    const Icon = meta.icon
                    return (
                      <button key={r.id} id={`sr-${r.id}`}
                              role="option" aria-selected={isSelected}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                              style={{
                                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                borderLeft: isSelected ? '2px solid var(--accent-1)' : '2px solid transparent',
                              }}
                              onMouseEnter={() => setSelected(globalIdx)}
                              onClick={() => go(r)}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: (r.color ?? meta.color) + '22', border: `1px solid ${(r.color ?? meta.color)}33` }}>
                          <Icon size={14} style={{ color: r.color ?? meta.color }} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                          {r.subtitle && <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>}
                        </div>
                        {isSelected && <ArrowRight size={13} style={{ color: 'var(--accent-3)', flexShrink: 0 }} aria-hidden="true" />}
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

        <div className="px-4 py-2.5 flex items-center gap-4 text-[10px]"
             style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>↵</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd style={{ fontFamily:'monospace', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>Esc</kbd> fechar</span>
          <span className="ml-auto flex items-center gap-1">
            <Clock size={10} aria-hidden="true" />
            {loading ? 'buscando…' : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return { open, setOpen }
}
