import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProfileCard } from '../../../components/card/ProfileCard'
import { getCollection, type CardData } from '../../../lib/socialApi'

/** Cartas que a pessoa colecionou, da mais recente para a mais antiga. */
export function ColecaoPage() {
  const [items, setItems] = useState<CardData[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (from: string | null, signal?: AbortSignal) => {
    setLoading(true); setFailed(false)
    try {
      const page = await getCollection(from, signal)
      setItems((current) => (from ? [...current, ...page.items] : page.items))
      setCursor(page.nextCursor)
    } catch { if (!signal?.aborted) setFailed(true) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(null, controller.signal)
    return () => controller.abort()
  }, [load])

  const count = `${items.length}${cursor ? '+' : ''} ${items.length === 1 && !cursor ? 'carta' : 'cartas'}`

  return (
    <main className="app-shell profile-shell">
      <div className="profile-content pf-content colecao">
        <Link className="pessoa-back" to="/perfil"><span aria-hidden="true">←</span> Voltar</Link>
        <h1>Minha coleção</h1>
        {!loading && !failed && items.length > 0 && <p className="pf-hint">{count}</p>}
        {failed && <p className="pf-error" role="alert">Não deu pra carregar sua coleção.</p>}
        {!loading && !failed && items.length === 0 && <p className="pf-empty">Escaneie o QR de alguém para começar sua coleção.</p>}
        {items.length > 0 && (
          <ul className="colecao-grid">
            {items.map((card) => (
              <li key={card.handle}>
                <Link to={`/comunidade/${card.handle}`} aria-label={`Ver perfil de ${card.name}`}><ProfileCard data={card} variant="mini" /></Link>
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="pf-empty" role="status">Carregando…</p>}
        {cursor && !loading && <button type="button" className="pf-btn" onClick={() => void load(cursor)}>Carregar mais</button>}
      </div>
    </main>
  )
}
