import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { KIND_LABEL, reviewEvent, type EventPatch, type ReviewBody, type ReviewEventDto, type ReviewKind } from '../../lib/eventsApi'
import { ApiError } from '../../lib/socialApi'
import { describeWhen } from './calendarFormat'
import { EventForm } from './EventForm'
import { useReviewQueue } from './hooks/useReviewQueue'

type Props = {
  /** Uma decisão foi tomada: recarregue o contador. */
  onChanged: () => void
  /** Mostra só os eventos dessa entidade (?entidade=<id>). */
  entityId?: string | null
}

const GROUPS: { kind: ReviewKind; title: string }[] = [
  { kind: 'new', title: 'Novos eventos' },
  { kind: 'edit', title: 'Edições' },
  { kind: 'reported', title: 'Denunciados' },
]
const NOTE_MAX = 280
const SUMMARY_MAX = 140

const shorten = (text: string) => (text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX).trimEnd()}…` : text)

function editDiff(event: ReviewEventDto): { label: string; before: string; after: string }[] {
  const changes = event.pendingChanges
  if (!changes) return []
  const rows: { label: string; before: string; after: string }[] = []
  if (changes.title !== undefined) rows.push({ label: 'Título', before: event.title, after: changes.title })
  if (changes.kind !== undefined) rows.push({ label: 'Tipo', before: KIND_LABEL[event.kind], after: KIND_LABEL[changes.kind] })
  if (changes.startsAt !== undefined || changes.endsAt !== undefined || changes.allDay !== undefined) {
    rows.push({
      label: 'Quando',
      before: describeWhen(event),
      after: describeWhen({
        startsAt: changes.startsAt ?? event.startsAt,
        endsAt: changes.endsAt !== undefined ? changes.endsAt : event.endsAt,
        allDay: changes.allDay ?? event.allDay,
      }),
    })
  }
  return rows
}

type CardProps = {
  event: ReviewEventDto
  onDone: (id: string, message: string) => void
  onConflict: (message: string) => void
}

type Confirm = 'reject' | 'remove' | null

function ReviewCard({ event, onDone, onConflict }: CardProps) {
  const uid = useId()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [note, setNote] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const kind = event.reviewKind

  // Retorna true quando a decisão foi aceita (o cartão sai da lista).
  async function decide(body: ReviewBody, message: string): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError(null)
    try {
      await reviewEvent(event.id, body)
      onDone(event.id, message)
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onConflict(err.message)
      else setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a decisão')
      setBusy(false)
      return false
    }
  }

  const reject = () => decide({ decision: 'reject', ...(note.trim() ? { note: note.trim() } : {}) }, kind === 'edit' ? 'Edição recusada' : 'Evento recusado')
  const diff = kind === 'edit' ? editDiff(event) : []

  return (
    <article className="cal-review-card" aria-label={event.title} aria-busy={busy}>
      <header className="cal-review-head">
        <h4 className="cal-review-title">{event.title}</h4>
        <span className="cal-status">{KIND_LABEL[event.kind]}</span>
      </header>
      <p className="cal-row-meta">{event.scopeLabel}{event.visibility === 'members' ? ' · só membros' : ''} · {describeWhen(event)}</p>
      <p className="cal-row-meta">Proposto por {event.author?.name ?? 'autor desconhecido'}</p>
      {event.description && kind !== 'edit' && <p className="cal-review-desc">{shorten(event.description)}</p>}
      {kind === 'reported' && <p className="cal-notice" role="note">Escondido após 3 denúncias</p>}
      {kind === 'edit' && (
        <dl className="cal-diff" aria-label="Mudanças pedidas">
          {diff.map((row) => (
            <div key={row.label} className="cal-diff-row">
              <dt>{row.label}</dt>
              <dd><span className="cal-diff-before">{row.before}</span><span aria-hidden="true"> → </span><span className="sr-only"> para </span><span className="cal-diff-after">{row.after}</span></dd>
            </div>
          ))}
        </dl>
      )}
      <Link className="cal-review-link" to={`/calendario?evento=${encodeURIComponent(event.id)}`}>Ver evento</Link>

      {error && <p className="cal-form-error" role="alert">{error}</p>}

      {confirm === 'reject' && (
        <div className="cal-confirm" role="group" aria-label="Confirmar recusa">
          <label className="com-label" htmlFor={`${uid}-note`}>Motivo (opcional)</label>
          <textarea id={`${uid}-note`} className="com-input cal-textarea" rows={2} maxLength={NOTE_MAX} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
          <div className="cal-actions">
            <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
            <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => void reject()}>{kind === 'edit' ? 'Recusar edição' : 'Recusar'}</button>
          </div>
        </div>
      )}
      {confirm === 'remove' && (
        <div className="cal-confirm" role="group" aria-label="Confirmar remoção">
          <p>Remover este evento? Não dá para desfazer.</p>
          <div className="cal-actions">
            <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
            <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => void decide({ decision: 'remove' }, 'Evento removido')}>Remover definitivamente</button>
          </div>
        </div>
      )}

      {confirm === null && (
        <div className="cal-actions cal-review-actions">
          {kind === 'new' && (
            <>
              <button type="button" className="com-btn cal-primary" disabled={busy} onClick={() => void decide({ decision: 'approve' }, 'Evento aprovado')}>Aprovar</button>
              <button type="button" className="com-btn" disabled={busy} onClick={() => setAdjusting(true)}>Ajustar e aprovar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => setConfirm('reject')}>Recusar</button>
            </>
          )}
          {kind === 'edit' && (
            <>
              <button type="button" className="com-btn cal-primary" disabled={busy} onClick={() => void decide({ decision: 'approve' }, 'Edição aprovada')}>Aprovar edição</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => setConfirm('reject')}>Recusar edição</button>
            </>
          )}
          {kind === 'reported' && (
            <>
              <button type="button" className="com-btn cal-primary" disabled={busy} onClick={() => void decide({ decision: 'restore' }, 'Evento restaurado')}>Restaurar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => setConfirm('remove')}>Remover</button>
            </>
          )}
        </div>
      )}

      {adjusting && (
        <EventForm
          event={event}
          onClose={() => setAdjusting(false)}
          onSaved={() => undefined}
          review={{
            onSubmit: async (patch: EventPatch) => {
              const changes = Object.keys(patch).length > 0 ? patch : undefined
              try {
                await reviewEvent(event.id, { decision: 'approve', ...(changes ? { changes } : {}) })
              } catch (err) {
                if (err instanceof ApiError && err.status === 409) { setAdjusting(false); onConflict(err.message); return }
                throw err
              }
              onDone(event.id, changes ? 'Evento aprovado com ajustes' : 'Evento aprovado')
            },
          }}
        />
      )}
    </article>
  )
}

/** Aba "Para revisar": novos eventos, edições e denunciados que o usuário modera. */
export function ReviewQueue({ onChanged, entityId = null }: Props) {
  const { events, loading, error, reload } = useReviewQueue()
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  // Fila nova do servidor: o que já foi decidido deixou de existir lá.
  useEffect(() => { setRemoved(new Set()) }, [events])

  const visible = useMemo(
    () => events.filter((e) => !removed.has(e.id) && (!entityId || (e.scope === 'entity' && e.scopeValue === entityId))),
    [events, removed, entityId],
  )

  const done = (id: string, message: string) => {
    setRemoved((prev) => new Set(prev).add(id))
    setNotice(message)
    onChanged()
  }
  const conflict = (message: string) => {
    setNotice(message)
    onChanged()
    reload()
  }

  if (error) {
    return (
      <div className="cal-error" role="alert">
        <p>Não foi possível carregar a fila de revisão.</p>
        <button type="button" className="com-btn" onClick={reload}>Tentar de novo</button>
      </div>
    )
  }
  if (loading && events.length === 0) return <p className="com-muted" role="status">Carregando…</p>

  return (
    <div className="cal-review" aria-busy={loading}>
      {notice && <p className="cal-notice" role="status">{notice}</p>}
      {entityId && <p className="cal-row-meta">Mostrando só os eventos desta entidade. <Link to="/calendario?aba=revisar">Ver tudo</Link></p>}
      {visible.length === 0 ? (
        <p className="com-muted cal-empty">Nada para revisar agora</p>
      ) : (
        GROUPS.map(({ kind, title }) => {
          const items = visible.filter((e) => e.reviewKind === kind)
          if (items.length === 0) return null
          return (
            <section key={kind} className="cal-review-group" aria-label={title}>
              <h3 className="cal-review-group-title">{title} <span className="cal-review-count">{items.length}</span></h3>
              <div className="cal-review-list">
                {items.map((event) => <ReviewCard key={event.id} event={event} onDone={done} onConflict={conflict} />)}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
