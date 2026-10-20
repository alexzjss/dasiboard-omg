import { Link } from 'react-router-dom'
import type { ConnectionState, PersonCard } from '../../../lib/socialApi'
import { entidadesData } from '../../entidades/data'
import { Avatar } from './Avatar'
import { ConnectButton } from './ConnectButton'

export function PersonCardView({ person, onConnection }: { person: PersonCard; onConnection: (handle: string, next: ConnectionState) => void }) {
  return (
    <li className="com-card">
      <Link to={`/comunidade/${person.handle}`} className="com-card-main" aria-label={`Ver perfil de ${person.name}`}>
        <Avatar name={person.name} picture={person.picture} />
        <span className="com-card-text">
          <span className="com-card-name">{person.name}</span>
          <span className="com-card-meta">{[person.course, person.entryYear ? `ingresso ${person.entryYear}` : ''].filter(Boolean).join(' · ')}</span>
        </span>
      </Link>
      {person.badges.length > 0 && (
        <ul className="com-badges" aria-label="Entidades">
          {person.badges.map((b) => {
            const ent = entidadesData.find((e) => e.id === b.entityId)
            return <li key={b.entityId} className="com-badge" style={ent ? { ['--badge-color' as string]: ent.accentColor } : undefined}>{ent?.name ?? b.label}</li>
          })}
        </ul>
      )}
      <div className="com-card-foot">
        {person.commonCourses !== null && person.commonCourses > 0
          ? <span className="com-common mono">{person.commonCourses} {person.commonCourses === 1 ? 'matéria' : 'matérias'} em comum</span>
          : <span />}
        <ConnectButton compact handle={person.handle} name={person.name} state={person.connection} onChange={(next) => onConnection(person.handle, next)} />
      </div>
    </li>
  )
}
