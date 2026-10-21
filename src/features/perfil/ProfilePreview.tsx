import { useEffect, useMemo, useState } from 'react'
import { getMyCard, type CardData, type MyProfile } from '../../lib/socialApi'
import { PersonView } from '../comunidade/person/PersonView'
import { visitorView } from './logic'
import { useConnections } from '../comunidade/hooks/useConnections'

export function ProfilePreview({ me }: { me: MyProfile }) {
  const { connections } = useConnections('accepted')
  const [card, setCard] = useState<CardData | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getMyCard(controller.signal).then((data) => setCard(data.card)).catch(() => undefined)
    return () => controller.abort()
  }, [])
  const view = useMemo(() => (card ? visitorView(me, connections, card) : null), [me, connections, card])
  return (
    <div className="pf-preview" role="region" aria-label="Prévia: como um aluno sem conexão com você vê seu perfil">
      <p className="pf-preview-note">Prévia com os dados salvos, como um aluno sem conexão com você veria.</p>
      {view ? <PersonView data={view} onConnection={() => undefined} /> : <p className="pf-empty" role="status">Carregando prévia…</p>}
    </div>
  )
}
