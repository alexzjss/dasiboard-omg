import { Link } from 'react-router-dom'
import type { ConnectionState, PersonCard } from '../../../lib/socialApi'
import { ProfileCard } from '../../../components/card/ProfileCard'
import { ConnectButton } from './ConnectButton'

export function PersonCardView({ person, onConnection }: { person: PersonCard; onConnection: (handle: string, next: ConnectionState) => void }) {
  return (
    <li className="com-mini">
      <Link to={`/comunidade/${person.handle}`} className="com-mini-link" aria-label={`Ver perfil de ${person.name} (@${person.handle})`}>
        <ProfileCard data={person.card} variant="mini" />
      </Link>
      <div className="com-card-foot">
        {person.commonCourses !== null && person.commonCourses > 0
          ? <span className="com-common mono">{person.commonCourses} {person.commonCourses === 1 ? 'matéria' : 'matérias'} em comum</span>
          : <span />}
        <ConnectButton compact handle={person.handle} name={person.name} state={person.connection} onChange={(next) => onConnection(person.handle, next)} />
      </div>
    </li>
  )
}
