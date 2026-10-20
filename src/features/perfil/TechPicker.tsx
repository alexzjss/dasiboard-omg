import { useId, useMemo, useState } from 'react'
import { TechChip } from '../../components/TechChip'
import { MAX_TECHNOLOGIES, TECHNOLOGIES, techById } from '../../lib/technologies'

const MAX_SUGGESTIONS = 8

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

/** Escolhe até 12 tecnologias: busca por nome, adicionar/remover e reordenar (arrastar ou botões ↑/↓). */
export function TechPicker({ value, onChange, labelledBy }: { value: string[]; onChange: (next: string[]) => void; labelledBy?: string }) {
  const uid = useId()
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const full = value.length >= MAX_TECHNOLOGIES

  const suggestions = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return []
    const taken = new Set(value)
    return TECHNOLOGIES.filter((tech) => !taken.has(tech.id) && normalize(tech.name).includes(needle)).slice(0, MAX_SUGGESTIONS)
  }, [query, value])

  function add(id: string) {
    if (full || value.includes(id)) return
    onChange([...value, id])
    setQuery('')
  }

  return (
    <div className="tech-picker">
      <div className="tech-picker-head">
        <input id={`${uid}-search`} className="com-input" type="search" autoComplete="off" value={query} placeholder="Buscar tecnologia (ex.: React)"
          aria-labelledby={labelledBy} onChange={(e) => setQuery(e.target.value)} disabled={full} />
        <span className={`pf-counter mono${full ? ' is-over' : ''}`} aria-live="polite">{value.length}/{MAX_TECHNOLOGIES}</span>
      </div>

      {query.trim() !== '' && (
        suggestions.length === 0 ? <p className="pf-hint">Nenhuma tecnologia encontrada.</p> : (
          <ul className="tech-picker-results">
            {suggestions.map((tech) => (
              <li key={tech.id}>
                <button type="button" className="pf-btn" disabled={full} aria-label={`Adicionar ${tech.name}`} onClick={() => add(tech.id)}>+ {tech.name}</button>
              </li>
            ))}
          </ul>
        )
      )}
      {full && <p className="pf-hint">Limite de {MAX_TECHNOLOGIES} tecnologias. Remova uma para adicionar outra.</p>}

      {value.length === 0 ? <p className="pf-empty">Nenhuma tecnologia escolhida.</p> : (
        <ol className="tech-picker-list" aria-label="Tecnologias escolhidas">
          {value.map((id, index) => {
            const name = techById(id)?.name ?? id
            return (
              <li key={id} className={`tech-picker-item${dragging === index ? ' is-dragging' : ''}`} draggable
                onDragStart={(e) => { setDragging(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragging !== null) onChange(move(value, dragging, index)); setDragging(null) }}
                onDragEnd={() => setDragging(null)}>
                <TechChip id={id} />
                <span className="tech-picker-actions">
                  <button type="button" className="pf-btn is-quiet" disabled={index === 0} aria-label={`Mover ${name} para cima`} onClick={() => onChange(move(value, index, index - 1))}>↑</button>
                  <button type="button" className="pf-btn is-quiet" disabled={index === value.length - 1} aria-label={`Mover ${name} para baixo`} onClick={() => onChange(move(value, index, index + 1))}>↓</button>
                  <button type="button" className="pf-btn is-quiet" aria-label={`Remover ${name}`} onClick={() => onChange(value.filter((other) => other !== id))}>×</button>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
