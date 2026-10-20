import { useCallback, useEffect, useRef, useState } from 'react'
import { getNotificationCount, type NotificationCount } from '../../../lib/socialApi'

export const NOTIFICATION_POLL_MS = 60_000
const EMPTY: NotificationCount = { unread: 0, pendingRequests: 0 }

/**
 * Contagens da central: notificações não lidas e pedidos de conexão pendentes. Busca ao montar, revalida quando a aba volta
 * a ficar visível e a cada 60s enquanto a aba estiver visível. Falhas valem 0 (silenciosas),
 * o que também cobre o /dev/home sem servidor.
 */
export function useNotificationCount() {
  const [counts, setCounts] = useState<NotificationCount>(EMPTY)
  const mountedRef = useRef(false)
  const seqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current
    let next = EMPTY
    try {
      next = await getNotificationCount()
    } catch {
      next = EMPTY
    }
    // Só a resposta mais recente conta, e nada é aplicado depois do unmount.
    if (mountedRef.current && seq === seqRef.current) setCounts(next)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, NOTIFICATION_POLL_MS)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  return { unread: counts.unread, pendingRequests: counts.pendingRequests, refresh }
}
