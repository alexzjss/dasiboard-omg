import { useEffect, useCallback, useState } from 'react'

const VAPID_KEY = '' // Coloque sua chave VAPID pública aqui

// ── Push Notifications Service ─────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function sendLocalNotification(title: string, opts?: NotificationOptions) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...opts,
  })
  return n
}

// ── useEventReminders hook ────────────────────────────────
// Agenda notificações locais para eventos próximos (1h antes e no dia)
export function useEventReminders() {
  const schedule = useCallback((events: Array<{ id: string; title: string; start_at: string; event_type: string }>) => {
    if (Notification.permission !== 'granted') return

    const now = Date.now()
    events.forEach(ev => {
      const start = new Date(ev.start_at).getTime()
      const oneHourBefore = start - 60 * 60 * 1000
      const delay1h = oneHourBefore - now
      const delayNow = start - now

      // 1h antes
      if (delay1h > 0 && delay1h < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          sendLocalNotification(`⏰ Em 1 hora: ${ev.title}`, {
            body: `Evento começa às ${new Date(start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            tag: `reminder-1h-${ev.id}`,
          })
        }, delay1h)
      }
      // Na hora
      if (delayNow > 0 && delayNow < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          sendLocalNotification(`🔔 Agora: ${ev.title}`, {
            body: 'Seu evento está começando!',
            tag: `reminder-now-${ev.id}`,
          })
        }, delayNow)
      }
    })
  }, [])

  return { schedule }
}

// ── Notification Permission Banner ───────────────────────
import { Bell, BellOff, X } from 'lucide-react'

export function NotificationBanner() {
  const [show, setShow]           = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)
    // Show banner only if not yet decided and not dismissed
    const dismissed = sessionStorage.getItem('notif-banner-dismissed')
    if (Notification.permission === 'default' && !dismissed) {
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const request = async () => {
    const perm = await requestPushPermission()
    setPermission(perm)
    setShow(false)
  }

  const dismiss = () => {
    sessionStorage.setItem('notif-banner-dismissed', '1')
    setShow(false)
  }

  if (!show || permission !== 'default') return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 z-[90] -translate-x-1/2 animate-in"
         style={{ width: 'min(92vw, 380px)' }}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
           style={{
             background: 'var(--bg-card)',
             border: '1px solid var(--accent-1)',
             boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
             backdropFilter: 'blur(12px)',
           }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
          <Bell size={15} style={{ color: 'var(--accent-3)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Ativar notificações</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Receba lembretes de provas e deadlines</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={request}
                  className="btn-primary text-xs py-1.5 px-3">
            Ativar
          </button>
          <button onClick={dismiss}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
