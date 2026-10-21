import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProfileCard } from '../../components/card/ProfileCard'
import { paletteOf } from '../../lib/cardOptions'
import { ApiError, collectCard, getCard, requestConnection, type CardData, type ConnectionState } from '../../lib/socialApi'
import { RevealCard } from './RevealCard'

type Load = { state: 'loading' } | { state: 'private' } | { state: 'missing' } | { state: 'error' } | { state: 'ready'; card: CardData }

function Shell({ backdrop, children }: { backdrop?: string; children: ReactNode }) {
  return <main className="cartapub" style={backdrop ? ({ '--backdrop': backdrop } as CSSProperties) : undefined}><div className="cartapub-inner">{children}</div></main>
}

/** Link público da carta, em /c/:handle. Fora do login e sem sidebar. */
export function CartaPublicaPage() {
  const { handle = '' } = useParams()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [revealing, setRevealing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [override, setOverride] = useState<{ collected?: boolean; connection?: ConnectionState }>({})

  useEffect(() => {
    const controller = new AbortController()
    setLoad({ state: 'loading' }); setRevealing(false); setOverride({}); setMessage('')
    getCard(handle, controller.signal).then((card) => setLoad({ state: 'ready', card })).catch((error) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) setLoad({ state: 'private' })
      else if (error instanceof ApiError && error.status === 404) setLoad({ state: 'missing' })
      else setLoad({ state: 'error' })
    })
    return () => controller.abort()
  }, [handle])

  const name = load.state === 'ready' ? load.card.name : null
  useEffect(() => {
    const previous = document.title
    document.title = name ? `Carta de ${name} · daSIboard` : 'Carta · daSIboard'
    return () => { document.title = previous }
  }, [name])

  const finishReveal = useCallback(() => setRevealing(false), [])
  const login = `/entrar?volta=${encodeURIComponent(`/c/${handle}`)}`

  if (load.state === 'loading') return <Shell><p className="cartapub-note" role="status">Carregando a carta…</p></Shell>
  if (load.state === 'private') {
    return <Shell>
      <div className="cartapub-state">
        <h1>Entre para ver esta carta</h1>
        <p>Essa carta não é pública. Entre com o e-mail da USP pra ver.</p>
        <Link className="pf-btn is-primary" to={login}>Entrar com Google</Link>
      </div>
    </Shell>
  }
  if (load.state === 'missing') {
    return <Shell><div className="cartapub-state" role="alert"><h1>Carta não encontrada</h1><p>Esse link não leva a nenhuma carta.</p></div></Shell>
  }
  if (load.state === 'error') return <Shell><p className="pf-error" role="alert">Não deu pra carregar a carta.</p></Shell>

  const card = load.card
  const viewer = card.viewer
  const collected = override.collected ?? viewer?.collected ?? false
  const connection = override.connection ?? viewer?.connection ?? 'none'
  const isOwner = connection === 'self'

  async function collect() {
    setBusy(true); setMessage('')
    try {
      const { status } = await collectCard(handle)
      setOverride((current) => ({ ...current, collected: true }))
      setRevealing(status === 'collected')
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Não deu certo. Tente de novo.')
    } finally { setBusy(false) }
  }

  async function connect() {
    setBusy(true); setMessage('')
    try {
      await requestConnection(handle)
      setOverride((current) => ({ ...current, connection: 'pending_sent' }))
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Não deu certo. Tente de novo.')
    } finally { setBusy(false) }
  }

  return (
    <Shell backdrop={paletteOf(card.settings.palette).backdrop}>
      {revealing ? <RevealCard data={card} onDone={finishReveal} /> : <ProfileCard data={card} />}
      <div className="cartapub-actions">
        {!viewer && <Link className="pf-btn is-primary" to={login}>Entrar para colecionar</Link>}
        {viewer && isOwner && <>
          <p className="cartapub-note">Essa é a sua carta</p>
          <Link className="pf-btn" to="/perfil/carta">Personalizar carta</Link>
        </>}
        {viewer && !isOwner && !collected && (
          <button type="button" className="pf-btn is-primary" disabled={busy} onClick={() => void collect()}>Colecionar</button>
        )}
        {viewer && !isOwner && collected && !revealing && <>
          <p className="cartapub-seal">Na sua coleção</p>
          {connection === 'none' && <button type="button" className="pf-btn is-primary" disabled={busy} onClick={() => void connect()}>Pedir conexão</button>}
          {connection === 'pending_sent' && <p className="cartapub-note">Pedido de conexão enviado</p>}
          <Link className="pf-btn" to={`/comunidade/${card.handle}`}>Ver perfil</Link>
          <Link className="cartapub-link" to="/perfil/colecao">Ver minha coleção</Link>
        </>}
        {message && <p className="pf-error" role="alert">{message}</p>}
      </div>
    </Shell>
  )
}
