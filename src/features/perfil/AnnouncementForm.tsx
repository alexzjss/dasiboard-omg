import { useState, type FormEvent } from 'react'
import { sendAdminAnnouncement, sendEntityAnnouncement, type AnnouncementAudience } from '../../lib/socialApi'
import { entidadesData } from '../entidades/data'
import { adminErrorMessage } from './logic'

type Scope = 'admin' | { entityId: string }

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'Todo mundo' },
  { value: 'course', label: 'Um curso' },
  { value: 'cohort', label: 'Uma turma (ano de ingresso)' },
  { value: 'entity', label: 'Membros de uma entidade' },
]

function confirmText(audience: AnnouncementAudience) {
  return audience === 'all' ? 'Enviar para todo mundo?' : 'Enviar este aviso para o público escolhido?'
}

export function AnnouncementForm({ scope }: { scope: Scope }) {
  const isAdmin = scope === 'admin'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [audience, setAudience] = useState<AnnouncementAudience>('all')
  const [audienceValue, setAudienceValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<number | null>(null)

  const needsValue = isAdmin && audience !== 'all'
  const canSubmit = !busy && title.trim() !== '' && body.trim() !== '' && (!needsValue || audienceValue.trim() !== '')

  function pickAudience(next: AnnouncementAudience) {
    setAudience(next)
    setAudienceValue(next === 'entity' ? entidadesData[0]?.id ?? '' : '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const question = isAdmin ? confirmText(audience) : 'Enviar este aviso para os membros da entidade?'
    if (!window.confirm(question)) return
    setBusy(true); setError(''); setSent(null)
    const base = { title: title.trim(), body: body.trim(), ...(link.trim() ? { link: link.trim() } : {}) }
    try {
      const res = scope === 'admin'
        ? await sendAdminAnnouncement({ ...base, audience, ...(audience !== 'all' ? { audienceValue: audienceValue.trim() } : {}) })
        : await sendEntityAnnouncement(scope.entityId, base)
      setSent(res.recipients)
      setTitle(''); setBody(''); setLink('')
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const key = isAdmin ? 'admin' : scope.entityId
  return (
    <div className="pf-admin-block">
      <h4 className="pf-subtitle">Enviar aviso</h4>
      <form className="pf-badge-form" onSubmit={(e) => void submit(e)}>
        <input className="com-input" value={title} maxLength={80} placeholder="Título" aria-label="Título do aviso" onChange={(e) => setTitle(e.target.value)} />
        <textarea className="com-input" value={body} maxLength={500} rows={3} placeholder="Texto do aviso" aria-label="Texto do aviso" onChange={(e) => setBody(e.target.value)} />
        <input className="com-input" value={link} maxLength={300} placeholder="Link (opcional): /entidades ou https://…" aria-label="Link do aviso" onChange={(e) => setLink(e.target.value)} />
        {isAdmin && (
          <>
            <select className="com-input" value={audience} aria-label="Público do aviso" onChange={(e) => pickAudience(e.target.value as AnnouncementAudience)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            {audience === 'course' && (
              <input className="com-input" value={audienceValue} maxLength={80} placeholder="Curso, como aparece no perfil" aria-label="Curso" onChange={(e) => setAudienceValue(e.target.value)} />
            )}
            {audience === 'cohort' && (
              <input className="com-input" value={audienceValue} inputMode="numeric" maxLength={4} placeholder="Ano, ex.: 2024" aria-label="Ano de ingresso" onChange={(e) => setAudienceValue(e.target.value)} />
            )}
            {audience === 'entity' && (
              <select className="com-input" value={audienceValue} aria-label="Entidade" onChange={(e) => setAudienceValue(e.target.value)}>
                {entidadesData.map((ent) => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
              </select>
            )}
          </>
        )}
        <button type="submit" className="pf-btn is-primary" disabled={!canSubmit} data-testid={`announce-${key}`}>{busy ? 'Enviando…' : 'Enviar aviso'}</button>
      </form>
      {sent !== null && <p className="pf-hint" role="status">Aviso enviado para {sent} {sent === 1 ? 'pessoa' : 'pessoas'}</p>}
      {error && <p className="pf-error" role="alert">{error}</p>}
    </div>
  )
}
