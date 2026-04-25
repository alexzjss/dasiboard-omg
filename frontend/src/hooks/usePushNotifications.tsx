import { useEffect, useCallback, useState } from 'react'

// ── Push Notifications Service ─────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  try {
    const result = Notification.requestPermission()
    // Modern browsers return a Promise; older Safari uses callback
    if (result && typeof (result as any).then === 'function') {
      return await result
    }
    // Legacy callback-only API
    return await new Promise<NotificationPermission>((resolve) => {
      Notification.requestPermission(resolve)
    })
  } catch {
    return Notification.permission
  }
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
export function useEventReminders() {
  const schedule = useCallback((events: Array<{ id: string; title: string; start_at: string; event_type: string }>) => {
    if (Notification.permission !== 'granted') return

    const now = Date.now()
    events.forEach(ev => {
      const start = new Date(ev.start_at).getTime()
      const oneHourBefore = start - 60 * 60 * 1000
      const delay1h = oneHourBefore - now
      const delayNow = start - now

      if (delay1h > 0 && delay1h < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          sendLocalNotification(`⏰ Em 1 hora: ${ev.title}`, {
            body: `Evento começa às ${new Date(start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            tag: `reminder-1h-${ev.id}`,
          })
        }, delay1h)
      }
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
import { Bell, X } from 'lucide-react'

export function NotificationBanner() {
  const [show,       setShow]       = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (!('Notification' in window)) return
    const current = Notification.permission
    setPermission(current)
    if (current !== 'default') return
    const dismissed = sessionStorage.getItem('notif-banner-dismissed')
    if (!dismissed) {
      const t = setTimeout(() => setShow(true), 3500)
      return () => clearTimeout(t)
    }
  }, [])

  const request = async () => {
    try {
      let perm: NotificationPermission
      // Safari uses callback API; modern browsers return a Promise
      if (typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission()
        if (result && typeof (result as any).then === 'function') {
          perm = await result
        } else {
          // Legacy callback style
          perm = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission(resolve)
          })
        }
      } else {
        perm = 'denied'
      }
      setPermission(perm)
      if (perm === 'granted') {
        // Force re-read from browser to ensure state is in sync
        setPermission(Notification.permission)
      }
    } catch {
      // Fallback: re-read current state
      setPermission(Notification.permission)
    }
    setShow(false)
  }

  const dismiss = () => {
    sessionStorage.setItem('notif-banner-dismissed', '1')
    setShow(false)
  }

  if (!show || permission !== 'default') return null

  return (
    /* z-[150] ensures it's above nav bars and modals */
    <div
      className="fixed left-1/2 z-[150] -translate-x-1/2 animate-in"
      style={{
        /* On mobile: above bottom nav (56px) + safe area; on desktop: above nothing */
        bottom: 'max(72px, calc(56px + env(safe-area-inset-bottom, 0px)))',
        width: 'min(92vw, 380px)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}
        >
          <Bell size={15} style={{ color: 'var(--accent-3)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Ativar notificações</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Receba lembretes de provas e deadlines</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* type="button" is critical — prevents accidental form submit and ensures user-gesture context */}
          <button
            type="button"
            onClick={request}
            className="btn-primary text-xs py-1.5 px-3"
            style={{ cursor: 'pointer' }}
          >
            Ativar
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
            aria-label="Dispensar"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
