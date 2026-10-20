import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFeed, type FeedItem, type PersonMini } from '../../../lib/socialApi'
import { entidadesData, entidadeSlug } from '../../entidades/data'
import { relativeTime } from './relativeTime'

const STEP = 5

function PersonLink({ p }: { p: PersonMini }) {
  return <Link to={`/comunidade/${p.handle}`} className="com-feed-link">{p.name}</Link>
}

function describe(item: FeedItem) {
  if (item.type === 'entity_join') {
    const ent = entidadesData.find((e) => e.id === item.entity.id)
    return <><PersonLink p={item.person} /> entrou em {ent
      ? <Link to={`/entidades/${entidadeSlug(ent)}`} className="com-feed-link">{item.entity.name}</Link>
      : item.entity.name}</>
  }
  if (item.type === 'connection') return <><PersonLink p={item.person} /> e <PersonLink p={item.other} /> se conectaram</>
  return <><PersonLink p={item.person} /> entrou no daSIboard</>
}

/** Feed compacto: mostra 5 itens por vez; "ver mais" revela os já carregados e busca a próxima página. */
export function FeedStrip() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [visible, setVisible] = useState(STEP)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const pending = useRef(false)

  const load = useCallback(async (from: string | null, signal?: AbortSignal) => {
    pending.current = true
    setLoading(true); setError(false)
    try {
      const page = await getFeed(from, signal)
      if (signal?.aborted) return
      setItems((prev) => (from ? [...prev, ...page.items] : page.items))
      setCursor(page.nextCursor)
    } catch {
      if (!signal?.aborted) setError(true)
    } finally {
      if (!signal?.aborted) setLoading(false)
      pending.current = false
    }
  }, [])

  useEffect(() => {
    const c = new AbortController()
    void load(null, c.signal)
    return () => c.abort()
  }, [load])

  function more() {
    if (visible < items.length) setVisible((v) => v + STEP)
    else if (cursor && !pending.current) { setVisible((v) => v + STEP); void load(cursor) }
  }

  const shown = items.slice(0, visible)
  const canMore = visible < items.length || cursor !== null

  return (
    <section className="com-feed" aria-labelledby="com-feed-title">
      <h2 id="com-feed-title" className="com-section-title">Novidades</h2>
      {loading && items.length === 0 && <div className="com-skeleton-line" aria-busy="true" aria-label="Carregando novidades" />}
      {error && (
        <p className="com-muted" role="alert">Não deu pra carregar as novidades. <button type="button" className="com-linkbtn" onClick={() => void load(items.length ? cursor : null)}>Tentar de novo</button></p>
      )}
      {!loading && !error && items.length === 0 && <p className="com-muted">Ainda sem novidades. Conecte-se com colegas e entre em entidades pra ver movimento por aqui.</p>}
      {shown.length > 0 && (
        <ul className="com-feed-list">
          {shown.map((item) => (
            <li key={item.id} className="com-feed-item">
              <span>{describe(item)}</span>
              <time dateTime={item.at} className="com-feed-time mono">{relativeTime(item.at)}</time>
            </li>
          ))}
        </ul>
      )}
      {canMore && !error && items.length > 0 && (
        <button type="button" className="com-linkbtn" onClick={more} disabled={loading}>{loading ? 'Carregando…' : 'Ver mais'}</button>
      )}
    </section>
  )
}
