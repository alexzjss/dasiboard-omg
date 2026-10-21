import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { apiFetch } from '../../lib/api'
import { DisciplineSearch } from './DisciplineSearch'
import type { Discipline, ScheduleEntry, Section, SectionSlot } from './types'

const dayLabels = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

type ManualSlot = SectionSlot & { room: string; sectionCode?: string }
type Picked = { discipline: Discipline; selected: string[]; manual: ManualSlot[] }

const slotLabel = (slot: SectionSlot) => `${dayLabels[slot.weekday]} ${slot.startsAt}–${slot.endsAt}`
const sectionLabel = (section: Section) => `Turma ${section.code.slice(-2)}`

function slotsLabel(section: Section) {
  return section.slots.map(slotLabel).join(' · ') || 'Sem horário definido'
}

function toScheduleEntries(picked: Picked[]): ScheduleEntry[] {
  return picked.flatMap(({ discipline, selected, manual }) => {
    const base = { title: discipline.title || discipline.code, code: discipline.code, building: '' }
    const fromSections = discipline.sections
      .filter((section) => selected.includes(section.code))
      .flatMap((section) => section.slots.map((slot) => ({ ...base, ...slot, sectionCode: section.code, room: section.room })))
    return [...fromSections, ...manual.map((slot) => ({ ...base, ...slot, sectionCode: slot.sectionCode ?? selected[0] ?? '' }))]
  })
}

/** Agrupa a grade salva por disciplina; cada horário vira um slot manual para poder ser removido. */
function pickedFromEntries(entries: ScheduleEntry[]): Picked[] {
  const groups = new Map<string, ScheduleEntry[]>()
  for (const entry of entries) groups.set(entry.code, [...(groups.get(entry.code) ?? []), entry])
  return [...groups.values()].map((group) => ({
    discipline: { code: group[0].code, title: group[0].title, sections: [] },
    selected: [],
    manual: group.map(({ weekday, startsAt, endsAt, room, sectionCode }) => ({ weekday, startsAt, endsAt, room, sectionCode })),
  }))
}

/** Monta a grade a partir das turmas públicas do JupiterWeb: só códigos, nenhuma senha. */
export function ScheduleBuilder({ isSaving, initialEntries, onSave, onCancel }: {
  isSaving: boolean
  initialEntries?: ScheduleEntry[]
  onSave: (entries: ScheduleEntry[]) => void
  onCancel?: () => void
}) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [picked, setPicked] = useState<Picked[]>(() => pickedFromEntries(initialEntries ?? []))

  async function addDiscipline(rawCode: string) {
    const code = rawCode.trim().toUpperCase()
    setSearchError('')
    if (!/^[A-Z]{3}\d{4}$/.test(code)) return setSearchError('Use o código da disciplina, por exemplo ACH2001.')
    if (picked.some((item) => item.discipline.code === code)) return setSearchError(`${code} já está na lista.`)
    setIsSearching(true)
    try {
      const response = await apiFetch(`/api/schedule/disciplines/${code}`)
      const data = await response.json().catch(() => null) as (Discipline & { error?: string }) | null
      if (response.status === 400 || response.status === 429) throw new Error(data?.error || 'Não foi possível buscar a disciplina.')
      // Without JupiterWeb data the discipline still goes in; the user types the times.
      const discipline = response.ok && data?.sections ? data : { code, title: '', sections: [] }
      if (!discipline.sections.length) setSearchError(`${data?.error || `Não achei as turmas de ${code} no JupiterWeb.`} Adicione os horários à mão abaixo.`)
      setPicked((current) => [...current, { discipline, selected: discipline.sections.length === 1 ? [discipline.sections[0].code] : [], manual: [] }])
      setQuery('')
    } catch (error) { setSearchError(error instanceof Error ? error.message : 'Não foi possível buscar a disciplina.') }
    finally { setIsSearching(false) }
  }

  function toggleSection(code: string, sectionCode: string) {
    setPicked((current) => current.map((item) => item.discipline.code !== code ? item : {
      ...item, selected: item.selected.includes(sectionCode) ? item.selected.filter((c) => c !== sectionCode) : [...item.selected, sectionCode],
    }))
  }

  function updateManual(code: string, update: (manual: ManualSlot[]) => ManualSlot[]) {
    setPicked((current) => current.map((item) => item.discipline.code !== code ? item : { ...item, manual: update(item.manual) }))
  }

  const entries = toScheduleEntries(picked)

  return (
    <div className="schedule-builder">
      <form className="jupiter-form" onSubmit={(event) => { event.preventDefault(); void addDiscipline(query) }}>
        <DisciplineSearch value={query} onChange={setQuery} onPick={(code) => void addDiscipline(code)} />
        <button className="import-button" type="submit" disabled={isSearching}>{isSearching ? 'Buscando…' : 'Adicionar'}</button>
      </form>
      {searchError && <p className="schedule-error" role="alert">{searchError}</p>}

      {picked.length > 0 && <ul className="builder-list">
        {picked.map(({ discipline, selected, manual }) => (
          <li key={discipline.code} className="builder-discipline">
            <div className="builder-discipline-head">
              <p><span className="mono">{discipline.code}</span> {discipline.title}</p>
              <button type="button" className="clear-schedule-button" aria-label={`Remover ${discipline.code}`} onClick={() => setPicked((current) => current.filter((item) => item.discipline.code !== discipline.code))}><Icon name="trash" /></button>
            </div>
            {discipline.sections.length > 0 && <fieldset className="builder-sections">
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
            </fieldset>}
            {manual.length > 0 && <ul className="builder-manual-list">
              {manual.map((slot, index) => (
                <li key={`${slot.weekday}-${slot.startsAt}-${index}`}>
                  <span>{slotLabel(slot)}{slot.room && ` · ${slot.room}`}</span>
                  <button type="button" className="builder-link-button" onClick={() => updateManual(discipline.code, (list) => list.filter((_, i) => i !== index))}>Remover</button>
                </li>
              ))}
            </ul>}
            <ManualSlotForm onAdd={(slot) => updateManual(discipline.code, (list) => [...list, slot])} />
          </li>
        ))}
      </ul>}

      {(picked.length > 0 || onCancel) && <div className="builder-actions">
        {onCancel && <button type="button" className="builder-cancel" onClick={onCancel}>Cancelar</button>}
        {picked.length > 0 && <button className="import-button builder-save" type="button" disabled={isSaving || entries.length === 0} onClick={() => onSave(entries)}>
          {isSaving ? 'Salvando…' : 'Salvar grade'}
        </button>}
      </div>}
      {initialEntries && entries.length === 0 && <p className="section-hint">Para apagar a grade inteira, use Apagar grade.</p>}
    </div>
  )
}

/** Horário digitado à mão, para turmas sem horário no JupiterWeb ou que mudaram de sala. */
function ManualSlotForm({ onAdd }: { onAdd: (slot: ManualSlot) => void }) {
  const [slot, setSlot] = useState<ManualSlot>({ weekday: 0, startsAt: '', endsAt: '', room: '' })
  const isValid = /^\d{2}:\d{2}$/.test(slot.startsAt) && /^\d{2}:\d{2}$/.test(slot.endsAt) && slot.startsAt < slot.endsAt

  return (
    <div className="builder-manual" role="group" aria-label="Adicionar horário à mão">
      <select aria-label="Dia da semana" value={slot.weekday} onChange={(e) => setSlot({ ...slot, weekday: Number(e.target.value) })}>
        {dayLabels.map((label, index) => <option key={label} value={index}>{label}</option>)}
      </select>
      <input aria-label="Início" type="time" value={slot.startsAt} onChange={(e) => setSlot({ ...slot, startsAt: e.target.value })} />
      <input aria-label="Fim" type="time" value={slot.endsAt} onChange={(e) => setSlot({ ...slot, endsAt: e.target.value })} />
      <input aria-label="Sala (opcional)" placeholder="Sala (opcional)" type="text" maxLength={80} value={slot.room} onChange={(e) => setSlot({ ...slot, room: e.target.value })} />
      <button type="button" className="builder-link-button" disabled={!isValid} onClick={() => { onAdd({ ...slot, room: slot.room.trim() }); setSlot({ ...slot, startsAt: '', endsAt: '', room: '' }) }}>+ Horário</button>
    </div>
  )
}
