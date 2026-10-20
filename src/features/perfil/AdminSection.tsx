import { useState, type CSSProperties } from 'react'
import {
  listEntityMembers, removeEntityMember, rotateInviteCode, setEntityAdmin,
  type EntityMember,
} from '../../lib/socialApi'
import { Avatar } from '../comunidade/components/Avatar'
import { entidadesData, type Entidade } from '../entidades/data'
import { AnnouncementForm } from './AnnouncementForm'
import { BadgesAdmin } from './BadgesAdmin'
import { adminErrorMessage } from './logic'

function InviteCode({ entity }: { entity: Entidade }) {
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function rotate() {
    if (!window.confirm(`Gerar novo código de ${entity.name}? O código antigo para de funcionar.`)) return
    setBusy(true); setError(''); setCopied(false)
    try {
      const { code: fresh } = await rotateInviteCode(entity.id)
      setCode(fresh)
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setError('Não consegui copiar. Selecione o código e copie manualmente.')
    }
  }

  return (
    <div className="pf-admin-block">
      <h4 className="pf-subtitle">Código de convite</h4>
      <button type="button" className="pf-btn" onClick={() => void rotate()} disabled={busy}>{busy ? 'Gerando…' : 'Gerar novo código'}</button>
      {code && (
        <div className="pf-code-reveal">
          <div className="pf-code-box">
            <code className="mono pf-code-value" data-testid={`code-${entity.id}`}>{code}</code>
            <button type="button" className="pf-btn is-primary" onClick={() => void copy()}>{copied ? 'Copiado' : 'Copiar'}</button>
          </div>
          <p className="pf-hint" role="status">Este código não será mostrado de novo. Copie e guarde agora.</p>
        </div>
      )}
      {error && <p className="pf-error" role="alert">{error}</p>}
    </div>
  )
}

function Members({ entity, selfHandle, isSuperadmin }: { entity: Entidade; selfHandle: string; isSuperadmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<EntityMember[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && members === null) {
      setLoading(true); setError('')
      try { setMembers(await listEntityMembers(entity.id)) }
      catch (err) { setError(adminErrorMessage(err)) }
      finally { setLoading(false) }
    }
  }

  async function remove(m: EntityMember) {
    if (!window.confirm(`Remover ${m.name} de ${entity.name}?`)) return
    setBusy(m.handle); setError('')
    try {
      await removeEntityMember(entity.id, m.handle)
      setMembers((list) => (list ?? []).filter((x) => x.handle !== m.handle))
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function setAdmin(m: EntityMember, admin: boolean) {
    setBusy(m.handle); setError('')
    try {
      const res = await setEntityAdmin(entity.id, m.handle, admin)
      setMembers((list) => (list ?? []).map((x) => (x.handle === m.handle ? { ...x, role: res.role } : x)))
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const panelId = `pf-members-${entity.id}`
  return (
    <div className="pf-admin-block">
      <h4 className="pf-subtitle">Membros</h4>
      <button type="button" className="pf-btn" aria-expanded={open} aria-controls={panelId} onClick={() => void toggle()}>
        {open ? 'Ocultar membros' : 'Ver membros'}
      </button>
      <div id={panelId} hidden={!open}>
        {loading && <p className="pf-empty" role="status">Carregando membros…</p>}
        {members && members.length === 0 && <p className="pf-empty">Nenhum membro ativo.</p>}
        {members && members.length > 0 && (
          <ul className="pf-list">
            {members.map((m) => {
              const isSelf = m.handle === selfHandle
              const canRemove = !isSelf && (m.role !== 'admin' || isSuperadmin)
              return (
                <li key={m.handle} className="pf-list-item">
                  <Avatar name={m.name} picture={m.picture} />
                  <div className="pf-person">
                    <span className="pf-person-name">{m.name}{m.role === 'admin' && <span className="pf-role-tag">admin</span>}</span>
                    <span className="pf-person-sub mono">@{m.handle}</span>
                  </div>
                  <div className="pf-item-actions">
                    {isSuperadmin && !isSelf && (
                      <button type="button" className="pf-btn" disabled={busy === m.handle} onClick={() => void setAdmin(m, m.role !== 'admin')}
                        aria-label={`${m.role === 'admin' ? 'Rebaixar' : 'Promover a admin'}: ${m.name}`}>
                        {m.role === 'admin' ? 'Rebaixar' : 'Promover a admin'}
                      </button>
                    )}
                    {canRemove && (
                      <button type="button" className="pf-btn is-danger" disabled={busy === m.handle} onClick={() => void remove(m)} aria-label={`Remover ${m.name} de ${entity.name}`}>Remover</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {error && <p className="pf-error" role="alert">{error}</p>}
    </div>
  )
}

/** Só renderizada para admin de alguma entidade ou superadmin (a página decide). */
export function AdminSection({ adminOf, isSuperadmin, selfHandle }: { adminOf: string[]; isSuperadmin: boolean; selfHandle: string }) {
  const entities = entidadesData.filter((e) => isSuperadmin || adminOf.includes(e.id))
  return (
    <div className="pf-admin">
      {isSuperadmin && (
        <article className="pf-admin-card" style={{ '--ent-accent': 'var(--area)' } as CSSProperties} aria-labelledby="pf-admin-badges">
          <h3 id="pf-admin-badges" className="pf-admin-title">Administração</h3>
          <BadgesAdmin title="Badges da administração" />
          <AnnouncementForm scope="admin" />
        </article>
      )}
      {entities.map((ent) => (
        <article key={ent.id} className="pf-admin-card" style={{ '--ent-accent': ent.accentColor } as CSSProperties} aria-labelledby={`pf-admin-${ent.id}`}>
          <h3 id={`pf-admin-${ent.id}`} className="pf-admin-title"><img src={ent.logo} alt="" />{ent.name}</h3>
          <InviteCode entity={ent} />
          <Members entity={ent} selfHandle={selfHandle} isSuperadmin={isSuperadmin} />
          <BadgesAdmin title={`Badges da ${ent.name}`} entityId={ent.id} />
          <AnnouncementForm scope={{ entityId: ent.id }} />
        </article>
      ))}
    </div>
  )
}
