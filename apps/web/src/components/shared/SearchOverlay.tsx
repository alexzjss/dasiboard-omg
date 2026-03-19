import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents, useDocentes, useEntidades, useNewsletter } from '../../api/hooks'
import { useDebounce } from '../../hooks/index'

interface SearchResult {
  id: string
  type: 'event' | 'docente' | 'entidade' | 'newsletter' | 'page'
  title: string
  subtitle?: string
  href?: string
  onClick?: () => void
  emoji?: string
}

const STATIC_PAGES: SearchResult[] = [
  { id: 'calendar',    type: 'page', title: 'Calendário',   subtitle: 'Provas e eventos',          href: '/calendar',    emoji: '📅' },
  { id: 'schedule',    type: 'page', title: 'Horários',     subtitle: 'Grade de aulas',            href: '/schedule',    emoji: '🗓️' },
  { id: 'kanban',      type: 'page', title: 'Kanban',       subtitle: 'Quadro de tarefas',         href: '/kanban',      emoji: '📋' },
  { id: 'newsletter',  type: 'page', title: 'Newsletter',   subtitle: 'Notícias do curso',         href: '/newsletter',  emoji: '📧' },
  { id: 'docentes',    type: 'page', title: 'Docentes',     subtitle: 'Professores',               href: '/docentes',    emoji: '👩‍🏫' },
  { id: 'estudos',     type: 'page', title: 'Estudos',      subtitle: 'Materiais e recursos',      href: '/estudos',     emoji: '📚' },
  { id: 'notas-gpa',   type: 'page', title: 'Notas & GPA',  subtitle: 'Desempenho acadêmico',      href: '/notas-gpa',   emoji: '📈' },
  { id: 'faltas',      type: 'page', title: 'Faltas',       subtitle: 'Controle de ausências',     href: '/faltas',      emoji: '📋' },
  { id: 'entidades',   type: 'page', title: 'Entidades',    subtitle: 'Grupos e ligas',            href: '/entidades',   emoji: '🏛️' },
  { id: 'ferramentas', type: 'page', title: 'Ferramentas',  subtitle: 'Pomodoro, notas, etc.',     href: '/ferramentas', emoji: '🛠️' },
  { id: 'desafios',    type: 'page', title: 'Desafios',     subtitle: 'Programação',               href: '/desafios',    emoji: '💻' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: Props) {
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 200)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState(0)

  const { data: events = [] }     = useEvents()
  const { data: docentes = [] }   = useDocentes()
  const { data: entidades = [] }  = useEntidades()
  const { data: newsletters = [] } = useNewsletter()

  useEffect(() => {
    if (open) {
      setQ('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [debounced])

  const results: SearchResult[] = debounced
    ? [
        // Static pages match
        ...STATIC_PAGES.filter((p) =>
          p.title.toLowerCase().includes(debounced.toLowerCase()) ||
          (p.subtitle ?? '').toLowerCase().includes(debounced.toLowerCase()),
        ),
        // Events
        ...events
          .filter((e) => e.title.toLowerCase().includes(debounced.toLowerCase()))
          .slice(0, 4)
          .map((e) => ({
            id: e.id, type: 'event' as const,
            title: e.title, subtitle: e.date.slice(0, 10),
            href: '/calendar', emoji: '📅',
          })),
        // Docentes
        ...docentes
          .filter((d) => d.name.toLowerCase().includes(debounced.toLowerCase()))
          .slice(0, 3)
          .map((d) => ({
            id: d.id, type: 'docente' as const,
            title: d.name, subtitle: d.area ?? 'Docente',
            href: '/docentes', emoji: '👩‍🏫',
          })),
        // Entidades
        ...entidades
          .filter((e) =>
            e.name.toLowerCase().includes(debounced.toLowerCase()) ||
            (e.fullName ?? '').toLowerCase().includes(debounced.toLowerCase()),
          )
          .slice(0, 3)
          .map((e) => ({
            id: e.id, type: 'entidade' as const,
            title: e.name, subtitle: e.type,
            href: `/entidades/${e.slug}`, emoji: e.emoji ?? '🏛️',
          })),
        // Newsletters
        ...newsletters
          .filter((n) => n.title.toLowerCase().includes(debounced.toLowerCase()))
          .slice(0, 2)
          .map((n) => ({
            id: n.id, type: 'newsletter' as const,
            title: n.title, subtitle: 'Newsletter',
            href: '/newsletter', emoji: '📧',
          })),
      ]
    : STATIC_PAGES

  function go(result: SearchResult) {
    if (result.onClick) result.onClick()
    else if (result.href) navigate(result.href)
    onClose()
    setQ('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      go(results[selected]!)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <>
      <div className="search-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="search-box">
          <div className="search-input-row">
            <span className="search-icon-lupe">🔍</span>
            <input
              ref={inputRef}
              className="search-input-field"
              placeholder="Buscar páginas, eventos, docentes, entidades..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="off"
            />
            {q && (
              <button className="search-clear" onClick={() => setQ('')}>✕</button>
            )}
            <kbd className="search-esc" onClick={onClose}>Esc</kbd>
          </div>

          <div className="search-results">
            {results.length === 0 ? (
              <div className="search-empty">Nenhum resultado para "{debounced}"</div>
            ) : (
              <>
                {!debounced && (
                  <div className="search-section-label">Páginas</div>
                )}
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    className={`search-result ${i === selected ? 'search-result--active' : ''}`}
                    onClick={() => go(r)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <span className="search-result-emoji">{r.emoji}</span>
                    <div className="search-result-text">
                      <span className="search-result-title">{r.title}</span>
                      {r.subtitle && (
                        <span className="search-result-sub">{r.subtitle}</span>
                      )}
                    </div>
                    <span className="search-result-type">{r.type}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="search-footer">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>Esc fechar</span>
          </div>
        </div>
      </div>

      <style>{`
        .search-overlay {
          position:fixed; inset:0; z-index:200;
          background:rgba(0,0,0,.6); backdrop-filter:blur(4px);
          display:flex; align-items:flex-start; justify-content:center;
          padding:80px 16px 16px;
        }
        .search-box {
          background:var(--bg2); border:1px solid var(--glass-border);
          border-radius:16px; width:100%; max-width:560px;
          box-shadow:0 24px 64px rgba(0,0,0,.4);
          display:flex; flex-direction:column; overflow:hidden;
        }
        .search-input-row {
          display:flex; align-items:center; gap:10px;
          padding:14px 16px; border-bottom:1px solid var(--glass-border);
        }
        .search-icon-lupe { font-size:16px; flex-shrink:0; }
        .search-input-field {
          flex:1; background:none; border:none; color:var(--text);
          font-size:15px; outline:none;
        }
        .search-input-field::placeholder { color:var(--text-dim); }
        .search-clear {
          background:none; border:none; cursor:pointer; color:var(--text-dim);
          font-size:14px; padding:2px 6px; border-radius:4px;
        }
        .search-clear:hover { color:var(--text); background:var(--glass); }
        .search-esc {
          font-size:11px; padding:2px 7px; border-radius:4px;
          border:1px solid var(--glass-border); color:var(--text-dim);
          cursor:pointer; background:var(--glass);
          font-family:var(--font-mono, monospace); white-space:nowrap;
        }
        .search-results {
          max-height:360px; overflow-y:auto; padding:8px;
        }
        .search-section-label {
          font-size:10px; font-weight:600; color:var(--text-dim);
          text-transform:uppercase; letter-spacing:.08em;
          padding:4px 8px 6px;
        }
        .search-empty {
          text-align:center; padding:32px; font-size:13px; color:var(--text-dim);
        }
        .search-result {
          display:flex; align-items:center; gap:10px;
          width:100%; padding:8px 10px; border-radius:8px;
          border:none; background:none; cursor:pointer; text-align:left;
          transition:background .1s;
        }
        .search-result:hover, .search-result--active {
          background:var(--glass);
        }
        .search-result-emoji { font-size:16px; flex-shrink:0; width:22px; }
        .search-result-text { flex:1; min-width:0; display:flex; flex-direction:column; }
        .search-result-title { font-size:13px; font-weight:500; color:var(--text); }
        .search-result-sub { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .search-result-type {
          font-size:10px; color:var(--text-dim); flex-shrink:0;
          text-transform:uppercase; letter-spacing:.05em;
        }
        .search-footer {
          display:flex; gap:16px; padding:8px 16px;
          border-top:1px solid var(--glass-border);
          font-size:11px; color:var(--text-dim);
        }
      `}</style>
    </>
  )
}
