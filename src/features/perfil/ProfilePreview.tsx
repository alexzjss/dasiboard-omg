import { useMemo } from 'react'
import type { MyProfile } from '../../lib/socialApi'
import { PersonView } from '../comunidade/person/PersonView'
import { visitorView } from './logic'
import { useConnections } from '../comunidade/hooks/useConnections'

export function ProfilePreview({ me }: { me: MyProfile }) {
  const { connections } = useConnections('accepted')
  const view = useMemo(() => visitorView(me, connections), [me, connections])
  return (
    <div className="pf-preview" role="region" aria-label="Prévia: como um aluno sem conexão com você vê seu perfil">
      <p className="pf-preview-note">Prévia com os dados salvos, como um aluno sem conexão com você veria.</p>
      <PersonView data={view} onConnection={() => undefined} />
    </div>
  )
}
