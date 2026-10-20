import { Link } from 'react-router-dom'
import { useEntityMembers } from './useEntityMembers'

const MAX_SHOWN = 12

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/** "Quem está no daSIboard": até 12 avatares linkando para o perfil. Erro esconde a seção inteira. */
export function EntidadeMembers({ entidadeId }: { entidadeId: string }) {
  const state = useEntityMembers(entidadeId)

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
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
