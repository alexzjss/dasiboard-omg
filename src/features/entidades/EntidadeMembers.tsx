import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { setMemberTitle } from '../../lib/socialApi'
import { useEntityMembers } from './useEntityMembers'
import { useMyEntityRole } from './useMyEntityRole'

const MAX_SHOWN = 12
const TITLE_MAX = 40

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function TitleEditor({ entidadeId, handle, initial, onSaved, onCancel }: {
  entidadeId: string; handle: string; initial: string; onSaved: (title: string | null) => void; onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true); setError('')
    try {
      const saved = await setMemberTitle(entidadeId, handle, value.trim() || null)
      onSaved(saved.title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o cargo.')
      setSaving(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); if (!saving) void save() }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <div className="ent-member-title-edit">
      <input className="com-input" value={value} maxLength={TITLE_MAX} autoFocus disabled={saving} placeholder="Cargo (Enter salva, Esc cancela)"
        aria-label={`Cargo de ${handle}`} onChange={(e) => setValue(e.target.value)} onKeyDown={onKeyDown} />
      {error && <span className="pf-error" role="alert">{error}</span>}
    </div>
  )
}

/** "Quem está no daSIboard": até 12 avatares linkando para o perfil. Erro esconde a seção inteira. */
export function EntidadeMembers({ entidadeId }: { entidadeId: string }) {
  const state = useEntityMembers(entidadeId)
  // Admin da entidade (ou superadmin) pode definir cargos.
  const canManage = useMyEntityRole(entidadeId).admin
  const [titles, setTitles] = useState<Record<string, string | null>>({})
  const [editing, setEditing] = useState<string | null>(null)

  if (state.status === 'error') return null

  if (state.status === 'loading') {
    return (
      <section className="ent-members-section" aria-busy="true">
        <h2 className="section-label">Quem está no daSIboard</h2>
        <p className="ent-members-status">Carregando…</p>
      </section>
    )
  }

  const { members } = state
  if (members.length === 0) {
    return (
      <section className="ent-members-section">
        <h2 className="section-label">Quem está no daSIboard</h2>
        <p className="ent-members-empty">
          Ninguém daqui entrou ainda. Tem o código? <Link to="/perfil">Use no seu perfil.</Link>
        </p>
      </section>
    )
  }

  const shown = members.slice(0, MAX_SHOWN)
  const titleOf = (member: { handle: string; title: string | null }) => (member.handle in titles ? titles[member.handle] : member.title)
  return (
    <section className="ent-members-section">
      <h2 className="section-label">Quem está no daSIboard</h2>
      <p className="ent-members-count">
        {members.length} {members.length === 1 ? 'pessoa daqui' : 'pessoas daqui'} no daSIboard
      </p>
      <ul className="ent-members">
        {shown.map((member) => (
          <li key={member.handle}>
            <Link to={`/comunidade/${encodeURIComponent(member.handle)}`} className="ent-member">
              <span className="ent-member-avatar" aria-hidden="true">
                {member.picture ? <img src={member.picture} alt="" referrerPolicy="no-referrer" /> : initialsOf(member.name)}
              </span>
              <span className="ent-member-name">{member.name}</span>
              {member.role === 'admin' && <span className="ent-member-admin">admin</span>}
              {titleOf(member) && <span className="ent-member-title">{titleOf(member)}</span>}
            </Link>
            {canManage && (editing === member.handle ? (
              <TitleEditor entidadeId={entidadeId} handle={member.handle} initial={titleOf(member) ?? ''} onCancel={() => setEditing(null)}
                onSaved={(title) => { setTitles((t) => ({ ...t, [member.handle]: title })); setEditing(null) }} />
            ) : (
              <button type="button" className="ent-member-set-title" onClick={() => setEditing(member.handle)} aria-label={`Definir cargo de ${member.name}`}>Definir cargo</button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  )
}
