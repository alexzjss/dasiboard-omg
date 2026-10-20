import { useEffect, useState, type FormEvent } from 'react'
import {
  archiveAdminBadge, archiveEntityBadge, createAdminBadge, createEntityBadge, grantAdminBadge, grantEntityBadge, listAdminBadges, listEntityBadges,
  revokeAdminBadge, revokeEntityBadge, type BadgeDefinition, type NewBadgeDefinition,
} from '../../lib/socialApi'
import { BadgeChip } from '../../components/BadgeChip'
import { adminErrorMessage } from './logic'

// Mantidos em sincronia com server/social/badgeCatalog.ts (o servidor é quem valida).
const ICONS = ['star', 'trophy', 'bolt', 'heart', 'code', 'mic', 'book', 'flag', 'rocket', 'shield', 'camera', 'users']
const COLORS = ['#e24a2b', '#f29a4a', '#e8b021', '#1f7a52', '#2f9e8f', '#2f5bd8', '#6b3fd4', '#c2408f', '#1d1d1f']
const ICON_NAMES: Record<string, string> = {
  star: 'Estrela', trophy: 'Troféu', bolt: 'Raio', heart: 'Coração', code: 'Código', mic: 'Microfone', book: 'Livro', flag: 'Bandeira', rocket: 'Foguete', shield: 'Escudo', camera: 'Câmera', users: 'Pessoas',
}

type Api = {
  list: () => Promise<BadgeDefinition[]>
  create: (input: NewBadgeDefinition) => Promise<BadgeDefinition>
  archive: (defId: string) => Promise<void>
  grant: (defId: string, handle: string) => Promise<void>
  revoke: (defId: string, handle: string) => Promise<void>
}

const adminApi: Api = { list: () => listAdminBadges(), create: createAdminBadge, archive: archiveAdminBadge, grant: grantAdminBadge, revoke: revokeAdminBadge }
const entityApi = (id: string): Api => ({
  list: () => listEntityBadges(id),
  create: (input) => createEntityBadge(id, input),
  archive: (defId) => archiveEntityBadge(id, defId),
  grant: (defId, handle) => grantEntityBadge(id, defId, handle),
  revoke: (defId, handle) => revokeEntityBadge(id, defId, handle),
})

const cleanHandle = (raw: string) => raw.trim().replace(/^@/, '').toLowerCase()

function CreateForm({ onCreate }: { onCreate: (input: NewBadgeDefinition) => Promise<void> }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [color, setColor] = useState(COLORS[0])
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onCreate({ label: label.trim(), description: description.trim() || undefined, icon, color })
      setLabel(''); setDescription('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pf-badge-form" onSubmit={(e) => void submit(e)}>
      <input className="com-input" value={label} maxLength={40} placeholder="Nome da badge" aria-label="Nome da badge" onChange={(e) => setLabel(e.target.value)} />
      <input className="com-input" value={description} maxLength={140} placeholder="Descrição (opcional)" aria-label="Descrição da badge" onChange={(e) => setDescription(e.target.value)} />
      <div className="pf-badge-grid" role="radiogroup" aria-label="Ícone">
        {ICONS.map((name) => (
          <button key={name} type="button" role="radio" aria-checked={icon === name} className={`pf-btn${icon === name ? ' is-primary' : ''}`} onClick={() => setIcon(name)}>{ICON_NAMES[name]}</button>
        ))}
      </div>
      <div className="pf-badge-grid" role="radiogroup" aria-label="Cor">
        {COLORS.map((hex) => (
          <button key={hex} type="button" role="radio" aria-checked={color === hex} aria-label={`Cor ${hex}`} className={`pf-swatch${color === hex ? ' is-selected' : ''}`} style={{ background: hex }} onClick={() => setColor(hex)} />
        ))}
      </div>
      <div className="pf-badge-preview">
        <BadgeChip badge={{ kind: 'admin_award', sourceId: 'preview', label: label.trim() || 'Pré-visualização', icon, color, entityId: null }} />
        <button type="submit" className="pf-btn is-primary" disabled={busy || !label.trim()}>{busy ? 'Criando…' : 'Criar badge'}</button>
      </div>
    </form>
  )
}

function Definition({ def, onArchive, onGrant, onRevoke }: {
  def: BadgeDefinition
  onArchive: () => Promise<void>
  onGrant: (handle: string) => Promise<void>
  onRevoke: (handle: string) => Promise<void>
}) {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const target = cleanHandle(handle)

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true); setStatus('')
    try { await action(); setStatus(done) }
    catch (err) { setStatus(adminErrorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <li className="pf-badge-def">
      <BadgeChip badge={{ kind: def.kind, sourceId: def.id, label: def.label, icon: def.icon, color: def.color, entityId: def.entityId }} />
      {def.description && <p className="pf-hint">{def.description}</p>}
      <div className="pf-badge-actions">
        <input className="com-input" value={handle} placeholder="@handle" aria-label={`Handle para ${def.label}`} onChange={(e) => setHandle(e.target.value)} />
        <button type="button" className="pf-btn" disabled={busy || !target} onClick={() => void run(() => onGrant(target), `Concedida a @${target}`)}>Conceder a @{target || 'handle'}</button>
        <button type="button" className="pf-btn" disabled={busy || !target} onClick={() => void run(() => onRevoke(target), `Revogada de @${target}`)}>Revogar de @{target || 'handle'}</button>
        <button type="button" className="pf-btn is-danger" disabled={busy} onClick={() => { if (window.confirm(`Arquivar a badge ${def.label}?`)) void run(onArchive, '') }}>Arquivar</button>
      </div>
      {status && <p className="pf-hint" role="status">{status}</p>}
    </li>
  )
}

export function BadgesAdmin({ title, entityId }: { title: string; entityId?: string }) {
  const [api] = useState<Api>(() => (entityId ? entityApi(entityId) : adminApi))
  const [defs, setDefs] = useState<BadgeDefinition[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.list().then((list) => { if (!cancelled) setDefs(list) }).catch((err) => { if (!cancelled) setError(adminErrorMessage(err)) })
    return () => { cancelled = true }
  }, [api])

  async function create(input: NewBadgeDefinition) {
    setError('')
    try { const def = await api.create(input); setDefs((list) => [...(list ?? []), def]) }
    catch (err) { setError(adminErrorMessage(err)) }
  }

  async function archive(def: BadgeDefinition) {
    await api.archive(def.id)
    setDefs((list) => (list ?? []).filter((x) => x.id !== def.id))
  }

  return (
    <div className="pf-admin-block">
      <h4 className="pf-subtitle">{title}</h4>
      <CreateForm onCreate={create} />
      {defs === null && !error && <p className="pf-empty" role="status">Carregando badges…</p>}
      {defs && defs.length === 0 && <p className="pf-empty">Nenhuma badge criada ainda.</p>}
      {defs && defs.length > 0 && (
        <ul className="pf-list pf-badge-defs">
          {defs.map((def) => (
            <Definition key={def.id} def={def} onArchive={() => archive(def)} onGrant={(h) => api.grant(def.id, h)} onRevoke={(h) => api.revoke(def.id, h)} />
          ))}
        </ul>
      )}
      {error && <p className="pf-error" role="alert">{error}</p>}
    </div>
  )
}
