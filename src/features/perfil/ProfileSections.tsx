import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLayout } from '../../app/layoutContext'
import { acceptConnection, ApiError, joinEntity, leaveEntity, removeConnection, type MyProfile, type Visibility } from '../../lib/socialApi'
import { Avatar } from '../comunidade/components/Avatar'
import { useConnections } from '../comunidade/hooks/useConnections'
import { entidadeSlug, entidadesData } from '../entidades/data'
import { SegmentedControl } from './SegmentedControl'

// ---------- pedidos de conexão ----------

export function PendingRequests() {
  const { connections, loading, error } = useConnections('pending')
  const { refreshNotifications } = useLayout()
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function act(handle: string, action: () => Promise<unknown>) {
    setBusy(handle); setMessage('')
    try {
      await action()
      setGone((g) => new Set(g).add(handle))
      refreshNotifications()
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Não deu certo. Tente de novo.')
    } finally {
      setBusy(null)
    }
  }

  const list = connections.filter((c) => !gone.has(c.handle))
  if (loading) return <p className="pf-empty" role="status">Carregando pedidos…</p>
  if (error) return <p className="pf-error" role="alert">Não foi possível carregar os pedidos.</p>
  return (
    <>
      {list.length === 0 ? <p className="pf-empty">Nenhum pedido pendente.</p> : (
        <ul className="pf-list">
          {list.map((r) => (
            <li key={r.handle} className="pf-list-item">
              <Avatar name={r.name} picture={r.picture} />
              <Link className="pf-person" to={`/comunidade/${encodeURIComponent(r.handle)}`}>
                <span className="pf-person-name">{r.name}</span>
                <span className="pf-person-sub">{r.course || `@${r.handle}`}</span>
              </Link>
              <div className="pf-item-actions">
                <button type="button" className="pf-btn is-primary" disabled={busy === r.handle}
                  onClick={() => void act(r.handle, () => acceptConnection(r.handle))} aria-label={`Aceitar pedido de ${r.name}`}>Aceitar</button>
                <button type="button" className="pf-btn" disabled={busy === r.handle}
                  onClick={() => void act(r.handle, () => removeConnection(r.handle))} aria-label={`Recusar pedido de ${r.name}`}>Recusar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="pf-error" role="alert">{message}</p>}
    </>
  )
}

// ---------- matérias ----------

export function MyCourses({ courses }: { courses: MyProfile['courses'] }) {
  if (courses.length === 0) {
    return <p className="pf-empty">Nenhuma matéria importada. <Link to="/">Importe sua grade do Jupiter</Link> para ver as matérias aqui.</p>
  }
  return (
    <ul className="pf-courses">
      {courses.map((c) => (
        <li key={c.code} className="pf-course"><span className="mono">{c.code}</span><span>{c.title}</span></li>
      ))}
    </ul>
  )
}

// ---------- entidades ----------

function joinErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    if (err.status === 0) return 'Sem conexão com o servidor. Tente de novo.'
  }
  return 'Código inválido'
}

export function MyEntities({ me, onChanged }: { me: MyProfile; onChanged: () => void }) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [leaveError, setLeaveError] = useState('')
  const memberOf = new Set(me.entities.map((e) => e.entityId))

  async function join(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true); setResult(null)
    try {
      const { entity } = await joinEntity(code.trim())
      setResult({ kind: 'ok', text: `Você entrou em ${entity.name}.` })
      setCode('')
      onChanged()
    } catch (err) {
      setResult({ kind: 'error', text: joinErrorMessage(err) })
    } finally {
      setJoining(false)
    }
  }

  async function leave(id: string, name: string) {
    if (!window.confirm(`Sair de ${name}? Você perde o selo da entidade e pode entrar de novo com um código.`)) return
    setLeaveError('')
    try {
      await leaveEntity(id)
      onChanged()
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : 'Não foi possível sair da entidade.')
    }
  }

  return (
    <>
      <ul className="pf-entities">
        {entidadesData.map((ent) => {
          const member = memberOf.has(ent.id)
          return (
            <li key={ent.id} className={`pf-entity${member ? ' is-member' : ''}`} style={{ '--ent-accent': ent.accentColor } as CSSProperties} data-member={member}>
              <Link className="pf-entity-link" to={`/entidades/${entidadeSlug(ent)}`}>
                <img src={ent.logo} alt="" />
                <span className="pf-entity-name">{ent.name}</span>
                <span className="pf-entity-state">{member ? 'Membro' : 'Não participa'}</span>
              </Link>
              {member && (
                <button type="button" className="pf-btn is-quiet" onClick={() => void leave(ent.id, ent.name)} aria-label={`Sair de ${ent.name}`}>Sair</button>
              )}
            </li>
          )
        })}
      </ul>
      {leaveError && <p className="pf-error" role="alert">{leaveError}</p>}

      <form className="pf-code-form" onSubmit={(e) => void join(e)}>
        <label htmlFor="pf-code">Tenho um código</label>
        <div className="pf-code-row">
          <input id="pf-code" className="com-input mono" value={code} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="DASI-XXXX-XXXX" maxLength={40} onChange={(e) => { setCode(e.target.value); setResult(null) }} />
          <button type="submit" className="pf-btn is-primary" disabled={joining || !code.trim()}>{joining ? 'Entrando…' : 'Entrar'}</button>
        </div>
        <p className={`pf-code-result${result?.kind === 'error' ? ' pf-error' : ' pf-ok'}`} role={result?.kind === 'error' ? 'alert' : 'status'}>{result?.text ?? ''}</p>
      </form>
    </>
  )
}

// ---------- privacidade ----------

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'connections', label: 'Só conexões' },
  { value: 'none', label: 'Ninguém' },
]

export function PrivacyControls({ profile, onChange }: {
  profile: MyProfile['profile']
  onChange: (patch: { showCourses?: Visibility; showConnections?: Visibility }) => Promise<void>
}) {
  const [error, setError] = useState('')

  async function change(patch: { showCourses?: Visibility; showConnections?: Visibility }) {
    setError('')
    try { await onChange(patch) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a privacidade.') }
  }

  return (
    <div className="pf-privacy">
      <div className="pf-privacy-row">
        <h3 id="pf-priv-courses" className="pf-subtitle">Quem vê minhas matérias</h3>
        <SegmentedControl value={profile.showCourses} options={VISIBILITY_OPTIONS} labelledBy="pf-priv-courses" onChange={(v) => void change({ showCourses: v })} />
      </div>
      <div className="pf-privacy-row">
        <h3 id="pf-priv-conn" className="pf-subtitle">Quem vê minhas conexões</h3>
        <SegmentedControl value={profile.showConnections} options={VISIBILITY_OPTIONS} labelledBy="pf-priv-conn" onChange={(v) => void change({ showConnections: v })} />
      </div>
      <p className="pf-hint">Nome, foto, curso e entidades ficam sempre visíveis para alunos logados.</p>
      {error && <p className="pf-error" role="alert">{error}</p>}
    </div>
  )
}
