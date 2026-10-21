import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { apiFetch } from '../../lib/api'
import type { Discipline, ScheduleEntry, Section } from './types'

const dayLabels = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

type Picked = { discipline: Discipline; selected: string[] }

const sectionLabel = (section: Section) => `Turma ${section.code.slice(-2)}`

function slotsLabel(section: Section) {
  return section.slots.map((slot) => `${dayLabels[slot.weekday]} ${slot.startsAt}–${slot.endsAt}`).join(' · ') || 'Sem horário definido'
}

function toScheduleEntries(picked: Picked[]): ScheduleEntry[] {
  return picked.flatMap(({ discipline, selected }) => discipline.sections
    .filter((section) => selected.includes(section.code))
    .flatMap((section) => section.slots.map((slot) => ({
      ...slot, title: discipline.title || discipline.code, code: discipline.code, sectionCode: section.code, room: section.room, building: '',
    }))))
}

/** Monta a grade a partir das turmas públicas do JupiterWeb: só códigos, nenhuma senha. */
export function ScheduleBuilder({ isSaving, onSave }: { isSaving: boolean; onSave: (entries: ScheduleEntry[]) => void }) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [picked, setPicked] = useState<Picked[]>([])

  async function addDiscipline(event: React.FormEvent) {
    event.preventDefault()
    const code = query.trim().toUpperCase()
    setSearchError('')
    if (!/^[A-Z]{3}\d{4}$/.test(code)) return setSearchError('Use o código da disciplina, por exemplo ACH2001.')
    if (picked.some((item) => item.discipline.code === code)) return setSearchError(`${code} já está na lista.`)
    setIsSearching(true)
    try {
      const response = await apiFetch(`/api/schedule/disciplines/${code}`)
      const data = await response.json().catch(() => null) as (Discipline & { error?: string }) | null
      if (!response.ok || !data?.sections) throw new Error(data?.error || 'Não foi possível buscar a disciplina.')
      setPicked((current) => [...current, { discipline: data, selected: data.sections.length === 1 ? [data.sections[0].code] : [] }])
      setQuery('')
    } catch (error) { setSearchError(error instanceof Error ? error.message : 'Não foi possível buscar a disciplina.') }
    finally { setIsSearching(false) }
  }

  function toggleSection(code: string, sectionCode: string) {
    setPicked((current) => current.map((item) => item.discipline.code !== code ? item : {
      ...item, selected: item.selected.includes(sectionCode) ? item.selected.filter((c) => c !== sectionCode) : [...item.selected, sectionCode],
    }))
  }

  const entries = toScheduleEntries(picked)

  return (
    <div className="schedule-builder">
      <form className="jupiter-form" onSubmit={addDiscipline}>
        <input autoComplete="off" aria-label="Código da disciplina" placeholder="Código da disciplina (ex.: ACH2001)" type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="import-button" type="submit" disabled={isSearching}>{isSearching ? 'Buscando…' : 'Adicionar'}</button>
      </form>
      {searchError && <p className="schedule-error" role="alert">{searchError}</p>}

      {picked.length > 0 && <ul className="builder-list">
        {picked.map(({ discipline, selected }) => (
          <li key={discipline.code} className="builder-discipline">
            <div className="builder-discipline-head">
              <p><span className="mono">{discipline.code}</span> {discipline.title}</p>
              <button type="button" className="clear-schedule-button" aria-label={`Remover ${discipline.code}`} onClick={() => setPicked((current) => current.filter((item) => item.discipline.code !== discipline.code))}><Icon name="trash" /></button>
            </div>
            <fieldset className="builder-sections">
              <legend>Qual é a sua turma?</legend>
              {discipline.sections.map((section) => (
                <label key={section.code} className="builder-section">
                  <input type="checkbox" checked={selected.includes(section.code)} onChange={() => toggleSection(discipline.code, section.code)} />
                  <span>
                    <strong>{sectionLabel(section)}</strong>{section.type && ` · ${section.type}`}
                    <span className="builder-section-meta">{slotsLabel(section)}</span>
                    {section.teachers.length > 0 && <span className="builder-section-meta">{section.teachers.join(', ')}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>}

      {picked.length > 0 && <button className="import-button builder-save" type="button" disabled={isSaving || entries.length === 0} onClick={() => onSave(entries)}>
        {isSaving ? 'Salvando…' : 'Salvar grade'}
      </button>}
    </div>
  )
}
