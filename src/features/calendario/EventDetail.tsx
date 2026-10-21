import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cancelEvent, KIND_LABEL, reportEvent, type EventDto } from '../../lib/eventsApi'
import { ApiError } from '../../lib/socialApi'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { describeWhen, statusBadge } from './calendarFormat'
import { EventForm } from './EventForm'

type Props = {
  event: EventDto
  onClose: () => void
  /** O evento mudou (editado, cancelado ou denunciado): recarregue a lista. `notice` é a mensagem curta para mostrar. */
  onChanged: (notice?: string) => void
}

type Confirm = 'cancel' | 'report' | null

const PENDING_LABEL = { title: 'Título', kind: 'Tipo' } as const

function pendingSummary(event: EventDto): string[] {
  const changes = event.pendingChanges
  if (!changes) return []
  const lines: string[] = []
  if (changes.title !== undefined) lines.push(`${PENDING_LABEL.title}: ${changes.title}`)
  if (changes.kind !== undefined) lines.push(`${PENDING_LABEL.kind}: ${KIND_LABEL[changes.kind]}`)
  if (changes.startsAt !== undefined) lines.push(`Data: ${describeWhen({ startsAt: changes.startsAt, endsAt: changes.endsAt ?? null, allDay: changes.allDay ?? event.allDay })}`)
  return lines
}

export function EventDetail({ event, onClose, onChanged }: Props) {
  const ref = useRef<HTMLElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  useDialogFocus(ref, onClose)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reported, setReported] = useState(event.reportedByMe)

  useEffect(() => { confirmRef.current?.querySelector<HTMLElement>('button, textarea')?.focus() }, [confirm])

  const badge = statusBadge(event)
  const pending = pendingSummary(event)
  const { permissions } = event
  const canReport = permissions.report && !reported

  async function run(action: () => Promise<string | undefined>, closeAfter: boolean) {
    setBusy(true)
    setError(null)
    try {
      const notice = await action()
      onChanged(notice)
      if (closeAfter) onClose()
      else setConfirm(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a operação')
    } finally {
      setBusy(false)
    }
  }

  const doCancel = () => run(async () => { await cancelEvent(event.id); return 'Evento cancelado' }, true)
  const doReport = () => run(async () => {
    const res = await reportEvent(event.id, reason.trim() || undefined)
    setReported(true)
    return res.hidden ? 'Denunciado; o evento foi escondido até um admin revisar' : 'Denunciado'
  }, false)

  return createPortal(
    <>
      <div className="cal-backdrop" onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className="cal-sheet" role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
        <div className="cal-sheet-handle" aria-hidden="true" />
        <div className="cal-panel-head">
          <h2 id={`${uid}-title`}>{event.title}</h2>
          <button type="button" className="com-btn" onClick={onClose}>Fechar</button>
        </div>

        {badge && <p><span className="cal-status">{badge}</span></p>}
        {event.status === 'rejected' && event.reviewNote && <p className="cal-notice" role="note">Motivo da recusa: {event.reviewNote}</p>}

        <dl className="cal-facts">
          <dt>Quando</dt>
          <dd>{describeWhen(event)}</dd>
          <dt>Tipo</dt>
          <dd>{KIND_LABEL[event.kind]}</dd>
          <dt>Escopo</dt>
          <dd>{event.scopeLabel}{event.visibility === 'members' ? ' · só membros' : ''}</dd>
          {event.location && <><dt>Local</dt><dd>{event.location}</dd></>}
          {event.link && <><dt>Link</dt><dd><a href={event.link} target="_blank" rel="noopener noreferrer">{event.link}</a></dd></>}
          {event.author && <><dt>Proposto por</dt><dd><Link to={`/comunidade/${event.author.handle}`}>{event.author.name}</Link></dd></>}
        </dl>

        {event.description && <p className="cal-description">{event.description}</p>}

        {pending.length > 0 && (
          <div className="cal-notice" role="note">
            <strong>Edição aguardando aprovação</strong>
            <ul>{pending.map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
        )}

        {error && <p className="cal-form-error" role="alert">{error}</p>}

        {confirm === 'cancel' && (
          <div className="cal-confirm" role="group" aria-label="Confirmar cancelamento" ref={confirmRef}>
            <p>Cancelar este evento? Não dá para desfazer.</p>
            <div className="cal-actions">
              <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={doCancel}>Cancelar evento</button>
            </div>
          </div>
        )}
        {confirm === 'report' && (
          <div className="cal-confirm" role="group" aria-label="Confirmar denúncia" ref={confirmRef}>
            <p>3 denúncias escondem o evento até um admin revisar.</p>
            <label className="com-label" htmlFor={`${uid}-reason`}>Motivo (opcional)</label>
            <textarea id={`${uid}-reason`} className="com-input cal-textarea" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="cal-actions">
              <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={doReport}>Denunciar</button>
            </div>
          </div>
        )}

        {confirm === null && (
          <div className="cal-actions">
            {permissions.edit && <button type="button" className="com-btn" onClick={() => setEditing(true)}>Editar</button>}
            {permissions.cancel && <button type="button" className="com-btn cal-danger" onClick={() => { setError(null); setConfirm('cancel') }}>Cancelar evento</button>}
            {canReport && <button type="button" className="com-btn" onClick={() => { setError(null); setConfirm('report') }}>Denunciar</button>}
            {permissions.report && reported && <span className="cal-status">Denunciado</span>}
          </div>
        )}
      </aside>
      {editing && (
        <EventForm
          event={event}
          onClose={() => setEditing(false)}
          onSaved={(message) => { setEditing(false); onChanged(message); onClose() }}
        />
      )}
    </>,
    document.body,
  )
}
