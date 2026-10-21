import { useEffect, useId, useRef, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { obrigatoriasData, optativasData } from '../disciplinas/data'

type Result = { code: string; title: string }

const fullCode = /^[A-Z]{3}\d{4}$/i
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Fallback when JupiterWeb's catalog is unavailable: the course's own disciplines.
function searchLocal(query: string): Result[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean)
  const byCode = new Map<string, Result>()
  for (const { disciplines } of [...obrigatoriasData, ...optativasData]) for (const { code, name } of disciplines) byCode.set(code, { code, title: name })
  return [...byCode.values()]
    .filter((item) => tokens.every((token) => fold(`${item.code} ${item.title}`).includes(token)))
    .sort((a, b) => Number(!fold(a.code).startsWith(tokens[0])) - Number(!fold(b.code).startsWith(tokens[0])))
    .slice(0, 12)
}

/** Combobox que busca disciplinas por código ou nome no catálogo da unidade. */
export function DisciplineSearch({ value, onChange, onPick, disabled }: { value: string; onChange: (value: string) => void; onPick: (code: string) => void; disabled?: boolean }) {
  const [results, setResults] = useState<Result[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const latest = useRef('')
  const listId = useId()

  useEffect(() => {
    const text = value.trim()
    latest.current = text
    if (text.length < 2) return
    const timer = setTimeout(async () => {
      try {
        const response = await apiFetch(`/api/schedule/disciplines?q=${encodeURIComponent(text)}`)
        const data = await response.json().catch(() => null) as { results?: Result[] } | null
        if (latest.current !== text) return
        setResults(response.ok && data?.results ? data.results : response.status >= 500 ? searchLocal(text) : [])
        setActive(-1)
        setIsOpen(true)
      } catch { if (latest.current === text) { setResults(searchLocal(text)); setActive(-1); setIsOpen(true) } }
    }, 250)
    return () => clearTimeout(timer)
  }, [value])

  function pick(code: string) {
    latest.current = ''
    setIsOpen(false); setActive(-1)
    onPick(code)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const open = isOpen && results.length > 0
    if (event.key === 'ArrowDown' && open) { event.preventDefault(); setActive((i) => (i + 1) % results.length) }
    else if (event.key === 'ArrowUp' && open) { event.preventDefault(); setActive((i) => (i <= 0 ? results.length : i) - 1) }
    else if (event.key === 'Escape' && isOpen) { event.preventDefault(); setIsOpen(false) }
    else if (event.key === 'Enter') {
      if (open && active >= 0) { event.preventDefault(); pick(results[active].code) }
      else if (fullCode.test(value.trim())) { event.preventDefault(); pick(value.trim().toUpperCase()) }
      else event.preventDefault()
    }
  }

  const showList = isOpen && value.trim().length >= 2
  return (
    <div className="discipline-search">
      <input
        role="combobox" aria-label="Buscar disciplina" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off" placeholder="Busque por código ou nome (ex.: ACH2001 ou Cálculo)" type="text" disabled={disabled}
        value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={() => results.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
      />
      <ul id={listId} role="listbox" aria-label="Disciplinas encontradas" className="discipline-options" hidden={!showList}>
        {results.map((result, index) => (
          <li key={result.code} id={`${listId}-${index}`} role="option" aria-selected={index === active} className={index === active ? 'is-active' : undefined}
            onMouseDown={(e) => e.preventDefault()} onClick={() => pick(result.code)}>
            <span className="mono">{result.code}</span> {result.title}
          </li>
        ))}
        {showList && results.length === 0 && <li className="discipline-empty" role="presentation">Nenhuma disciplina encontrada.</li>}
      </ul>
    </div>
  )
}
