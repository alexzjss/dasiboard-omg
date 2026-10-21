import { useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApiError } from '../../lib/socialApi'
import { createEvent, KIND_LABEL, updateEvent, type EventDto, type EventKind, type EventPatch, type EventScopeOption } from '../../lib/eventsApi'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { buildCreateInput, buildPatch, emptyValues, scopeKey, validateValues, valuesFromEvent, withAllDay, type FormValues } from './eventFormModel'
import { useEventScopes } from './hooks/useEventScopes'

type Props = {
  /** Presente: modo edição (o escopo não muda). Ausente: propor evento novo. */
  event?: EventDto
  onClose: () => void
  /** Depois de salvar: mensagem curta para mostrar na página ("Enviado para aprovação", "Publicado", "Salvo"). */
  onSaved: (message: string) => void
  /**
   * Modo de revisão (moderador ajustando antes de aprovar): exige `event`. Ao enviar, chama `onSubmit` com só os campos
   * alterados (pode ser vazio) em vez de salvar o evento; `onSaved` não é usado.
   */
  review?: { onSubmit: (patch: EventPatch) => Promise<void> }
  /** Escopo já selecionado ao propor um evento novo (ex.: ?propor=<entidade>). */
  initialScope?: Pick<EventScopeOption, 'scope' | 'scopeValue'>
}

const KINDS = Object.keys(KIND_LABEL) as EventKind[]
const GROUPS: { label: string; scopes: EventScopeOption['scope'][] }[] = [
  { label: 'Geral', scopes: ['usp', 'campus', 'course', 'cohort'] },
  { label: 'Minhas matérias', scopes: ['class'] },
  { label: 'Minhas entidades', scopes: ['entity'] },
]

function approvalText(scope: EventScopeOption): string {
  return scope.scope === 'entity' ? `Vai para aprovação dos admins de ${scope.label}` : 'Vai para aprovação da administração'
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Não foi possível salvar o evento'
}

export function EventForm({ event, onClose, onSaved, review, initialScope }: Props) {
  const ref = useRef<HTMLElement>(null)
  useDialogFocus(ref, onClose)
  const uid = useId()
  const editing = event !== undefined
  const { scopes, loading: scopesLoading, error: scopesError, reload } = useEventScopes()
  const initial = useMemo(() => (event ? valuesFromEvent(event) : emptyValues()), [event])
  const [values, setValues] = useState<FormValues>(initial)
  const [chosenScope, setChosenScope] = useState(() => (initialScope ? scopeKey(initialScope) : ''))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const scope = useMemo<EventScopeOption | null>(() => {
    if (event) return null
    return scopes.find((s) => scopeKey(s) === chosenScope) ?? scopes[0] ?? null
  }, [event, scopes, chosenScope])

  const scopeScope = event ? event.scope : scope?.scope
  const set = (patch: Partial<FormValues>) => setValues((v) => ({ ...v, ...patch }))
  const reviewing = review !== undefined && editing
  const gatedEdit = !reviewing && editing && event.status === 'approved' && event.scope !== 'class' && !event.permissions.moderate
  const dateType = values.allDay ? 'date' : 'datetime-local'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const startChanged = !editing || values.startsAt !== initial.startsAt || values.allDay !== initial.allDay
    const invalid = validateValues(values, { checkStart: startChanged })
    if (invalid) { setError(invalid); return }
    setSaving(true)
    setError(null)
    try {
      if (reviewing) {
        await review.onSubmit(buildPatch(initial, values, event.scope))
        return
      }
      if (editing) {
        const patch = buildPatch(initial, values, event.scope)
        if (Object.keys(patch).length === 0) { setError('Nada foi alterado'); setSaving(false); return }
        const saved = await updateEvent(event.id, patch)
        onSaved(saved.status === 'approved' && saved.pendingChanges ? 'Enviado para aprovação' : 'Salvo')
      } else {
        if (!scope) { setSaving(false); return }
        const created = await createEvent(buildCreateInput(scope, values))
        onSaved(created.status === 'pending' ? 'Enviado para aprovação' : 'Publicado')
      }
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  const heading = reviewing ? 'Ajustar e aprovar' : editing ? 'Editar evento' : 'Propor evento'
  const reviewNotice = gatedEdit ? 'Mudar isso manda a edição para aprovação; até lá vale a versão atual' : null

  return createPortal(
    <>
      <div className="cal-backdrop" onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className="cal-sheet" role="dialog" aria-modal="true" aria-labelledby={`${uid}-h`}>
        <div className="cal-sheet-handle" aria-hidden="true" />
        <div className="cal-panel-head">
          <h2 id={`${uid}-h`}>{heading}</h2>
          <button type="button" className="com-btn" onClick={onClose}>Fechar</button>
        </div>

        <form className="cal-form" onSubmit={submit} noValidate>
          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-scope`}>Onde</label>
            {editing ? (
              <>
                <input id={`${uid}-scope`} className="com-input" value={event.scopeLabel} disabled readOnly />
                <span className="cal-hint">O escopo não pode ser mudado; para isso, cancele e proponha de novo.</span>
              </>
            ) : scopesError ? (
              <p className="cal-form-error" role="alert">Não foi possível carregar os escopos. <button type="button" className="com-linkbtn" onClick={reload}>Tentar de novo</button></p>
            ) : (
              <select id={`${uid}-scope`} className="com-input" value={scope ? scopeKey(scope) : ''} disabled={scopesLoading} onChange={(e) => setChosenScope(e.target.value)}>
                {GROUPS.map((g) => {
                  const items = scopes.filter((s) => g.scopes.includes(s.scope))
                  return items.length === 0 ? null : (
                    <optgroup key={g.label} label={g.label}>
                      {items.map((s) => <option key={scopeKey(s)} value={scopeKey(s)}>{s.label}</option>)}
                    </optgroup>
                  )
                })}
              </select>
            )}
          </div>

          {scopeScope === 'entity' && (
            <label className="cal-check">
              <input type="checkbox" checked={values.membersOnly} onChange={(e) => set({ membersOnly: e.target.checked })} />
              <span>Só membros da entidade</span>
            </label>
          )}

          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-kind`}>Tipo</label>
            <select id={`${uid}-kind`} className="com-input" value={values.kind} onChange={(e) => set({ kind: e.target.value as EventKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>

          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-title`}>Título</label>
            <input id={`${uid}-title`} className="com-input" value={values.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
          </div>

          <label className="cal-check">
            <input type="checkbox" checked={values.allDay} onChange={(e) => setValues((v) => withAllDay(v, e.target.checked))} />
            <span>Dia inteiro</span>
          </label>

          <div className="cal-form-row">
            <div className="com-field">
              <label className="com-label" htmlFor={`${uid}-start`}>Início</label>
              <input id={`${uid}-start`} className="com-input" type={dateType} value={values.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </div>
            <div className="com-field">
              <label className="com-label" htmlFor={`${uid}-end`}>Fim (opcional)</label>
              <input id={`${uid}-end`} className="com-input" type={dateType} value={values.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
            </div>
          </div>
          {reviewNotice && <p className="cal-notice" role="note">{reviewNotice}</p>}

          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-loc`}>Local (opcional)</label>
            <input id={`${uid}-loc`} className="com-input" value={values.location} maxLength={120} onChange={(e) => set({ location: e.target.value })} />
          </div>
          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-link`}>Link https (opcional)</label>
            <input id={`${uid}-link`} className="com-input" type="url" inputMode="url" value={values.link} maxLength={300} onChange={(e) => set({ link: e.target.value })} />
          </div>
          <div className="com-field">
            <label className="com-label" htmlFor={`${uid}-desc`}>Descrição (opcional)</label>
            <textarea id={`${uid}-desc`} className="com-input cal-textarea" rows={4} value={values.description} maxLength={1000} onChange={(e) => set({ description: e.target.value })} />
          </div>

          {!editing && scope && (
            <p className="cal-notice" role="note">{scope.moderated ? approvalText(scope) : 'Publica na hora'}</p>
          )}
          {error && <p className="cal-form-error" role="alert">{error}</p>}

          <div className="cal-actions">
            <button type="button" className="com-btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="com-btn cal-primary" disabled={saving || (!editing && !scope)}>{saving ? 'Enviando…' : reviewing ? 'Aprovar com ajustes' : editing ? 'Salvar' : 'Enviar'}</button>
          </div>
        </form>
      </aside>
    </>,
    document.body,
  )
}
