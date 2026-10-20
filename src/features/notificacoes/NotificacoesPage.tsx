import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../../app/layoutContext'
import {
  acceptConnection, ApiError, listNotifications, markAllNotificationsRead, markNotificationRead, removeConnection,
  type NotificationItem,
} from '../../lib/socialApi'
import { Avatar } from '../comunidade/components/Avatar'
import { relativeTime } from '../comunidade/components/relativeTime'
import { PushOptIn } from './PushOptIn'

const GENERIC_ERROR = 'Não deu certo. Tente de novo.'
const errorText = (err: unknown) => (err instanceof ApiError ? err.message : GENERIC_ERROR)

export function NotificacoesPage() {
  const navigate = useNavigate()
  const { refreshNotifications } = useLayout()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Record<string, 'accepted' | 'declined'>>({})
  const [error, setError] = useState('')
  const refreshRef = useRef(refreshNotifications)
  useEffect(() => { refreshRef.current = refreshNotifications }, [refreshNotifications])

  useEffect(() => {
    const controller = new AbortController()
    listNotifications(null, controller.signal)
      .then((page) => { setItems(page.items); setCursor(page.nextCursor); setStatus('ready'); refreshRef.current() })
      .catch((err: unknown) => { if (!controller.signal.aborted) { setStatus('error'); setError(errorText(err)) } })
    return () => controller.abort()
  }, [])

  const markReadLocal = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  async function open(n: NotificationItem) {
    setError('')
    if (!n.read) {
      try { await markNotificationRead(n.id); markReadLocal(n.id); refreshNotifications() } catch (err) { setError(errorText(err)) }
    }
    if (n.url.startsWith('https://')) window.open(n.url, '_blank', 'noopener,noreferrer')
    else if (n.url.startsWith('/')) navigate(n.url)
  }

  async function answer(n: NotificationItem, action: 'accepted' | 'declined') {
    if (!n.actor) return
    setBusyId(n.id); setError('')
    try {
      if (action === 'accepted') await acceptConnection(n.actor.handle)
      else await removeConnection(n.actor.handle)
      setResolved((prev) => ({ ...prev, [n.id]: action }))
      if (!n.read) { await markNotificationRead(n.id).catch(() => undefined); markReadLocal(n.id) }
      refreshNotifications()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusyId(null)
    }
  }

  async function markAll() {
    setError('')
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      refreshNotifications()
    } catch (err) { setError(errorText(err)) }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true); setError('')
    try {
      const page = await listNotifications(cursor)
      setItems((prev) => [...prev, ...page.items.filter((n) => !prev.some((p) => p.id === n.id))])
      setCursor(page.nextCursor)
    } catch (err) { setError(errorText(err)) }
    finally { setLoadingMore(false) }
  }

  const hasUnread = items.some((n) => !n.read)

  return (
    <main className="com-content notif-page">
      <header className="com-heading notif-head">
        <h1>Notificações</h1>
        <button type="button" className="com-btn" disabled={!hasUnread} onClick={() => void markAll()}>Marcar todas como lidas</button>
      </header>

      <PushOptIn />

      {error && <p className="notif-error" role="alert">{error}</p>}
      {status === 'loading' && <p className="com-muted">Carregando…</p>}
      {status === 'ready' && items.length === 0 && <p className="com-muted">Nada por aqui ainda.</p>}

      {items.length > 0 && (
        <ul className="notif-list">
          {items.map((n) => {
            const res = resolved[n.id]
            const showActions = n.type === 'connection_request' && n.actor && !res
            return (
              <li key={n.id} className={`notif-item${n.read ? '' : ' is-unread'}`}>
                <button type="button" className="notif-main" onClick={() => void open(n)}>
                  {n.actor && <Avatar name={n.actor.name} picture={n.actor.picture} />}
                  <span className="notif-text">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-body">{res === 'accepted' ? 'Conexão aceita.' : res === 'declined' ? 'Pedido recusado.' : n.body}</span>
                    <time className="notif-time" dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
                  </span>
                  {!n.read && <span className="notif-dot" aria-label="Não lida" />}
                </button>
                {showActions && (
                  <div className="notif-actions">
                    <button type="button" className="com-btn notif-accept" disabled={busyId === n.id} onClick={() => void answer(n, 'accepted')}>Aceitar</button>
                    <button type="button" className="com-btn" disabled={busyId === n.id} onClick={() => void answer(n, 'declined')}>Recusar</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {cursor && (
        <button type="button" className="com-btn notif-more" disabled={loadingMore} onClick={() => void loadMore()}>
          {loadingMore ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </main>
  )
}
