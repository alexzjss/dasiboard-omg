import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProfileCard } from '../../../components/card/ProfileCard'
import { getMyCard, type CardData } from '../../../lib/socialApi'

/** A própria carta no perfil, com o atalho para o editor. */
export function MyCardSection() {
  const [card, setCard] = useState<CardData | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    getMyCard(controller.signal).then((data) => setCard(data.card)).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [])
  if (failed) return <p className="pf-error" role="alert">Não deu pra carregar sua carta.</p>
  if (!card) return <p className="pf-empty" role="status">Carregando sua carta…</p>
  return (
    <div className="pf-card-block">
      <ProfileCard data={card} />
      <Link className="pf-btn is-primary" to="/perfil/carta">Personalizar carta</Link>
      <Link className="pf-btn" to="/perfil/colecao">Minha coleção</Link>
    </div>
  )
}
