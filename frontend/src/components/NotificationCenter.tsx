// ── Central de Notificações — sino + dropdown ────────────────────────────────
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck, Trash2, BellOff, BellRing, Clock } from 'lucide-react'
import { useNotifications, AppNotification, setDnd } from '@/hooks/useNotifications'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ n, onRead, onDelete, onNavigate }: {
  n: AppNotification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (href?: string) => void
}) {
  const isUnread = !n.readAt
  const timeAgo  = formatDistanceToNow(parseISO(n.createdAt), { locale: ptBR, addSuffix: true })

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-all cursor-pointer group"
      style={{
        background: isUnread ? 'var(--accent-soft)' : 'transparent',
        borderLeft: isUnread ? '2px solid var(--accent-1)' : '2px solid transparent',
      }}
      onClick={() => { onRead(n.id); onNavigate(n.href) }}
    >
      {/* Emoji */}
      <div className="text-xl shrink-0 mt-0.5" style={{ lineHeight: 1 }}>{n.emoji}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug" style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {n.title}
        </p>
        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {n.body}
        </p>
        <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{timeAgo}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button onClick={e => { e.stopPropagation(); onRead(n.id) }}
                  className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-80"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
            <Check size={11} />
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(n.id) }}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <X size={11} />
        </button>
      </div>
    </div>
  )
}

// ── DND quick picker ──────────────────────────────────────────────────────────
function DndPicker({ dndUntil, onActivate, onDeactivate }: {
  dndUntil: Date | null
  onActivate: (h: number) => void
  onDeactivate: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  if (dndUntil) {
    const untilStr = format(dndUntil, "HH:mm", { locale: ptBR })
    return (
      <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
           style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
        <BellOff size={10} />
        <span>DND até {untilStr}</span>
        <button onClick={onDeactivate} className="hover:opacity-70"><X size={9}/></button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <BellOff size={10}/> Silenciar
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-10"
             style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 140 }}>
          {[1, 2, 4, 8, 24].map(h => (
            <button key={h} onClick={() => { onActivate(h); setOpen(false) }}
                    className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {h < 24 ? `${h} hora${h > 1 ? 's' : ''}` : '1 dia'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main NotificationCenter ───────────────────────────────────────────────────
export function NotificationCenter({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0 })
  const ref             = useRef<HTMLDivElement>(null)
  const btnRef          = useRef<HTMLButtonElement>(null)
  const navigate        = useNavigate()
  const {
    notifications, unread, markRead, markAllRead,
    deleteNotif, clearAll, dndUntil, activateDnd, deactivateDnd, isDnd,
  } = useNotifications()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({
        top:  r.bottom + 8,
        left: align === 'left' ? r.left : r.right - 340,
      })
    }
    setOpen(v => !v)
    if (!open) markAllRead()
  }

  const handleNavigate = (href?: string) => {
    setOpen(false)
    if (href) navigate(href)
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: open ? 'var(--accent-soft)' : 'var(--border)',
          color: open ? 'var(--accent-3)' : 'var(--text-secondary)',
          border: open ? '1px solid var(--accent-1)' : '1px solid transparent',
        }}
        title="Notificações"
        aria-label={`Notificações${unread > 0 ? ` (${unread} novas)` : ''}`}
      >
        {isDnd ? <BellOff size={16} /> : <Bell size={16} />}
        {/* Badge */}
        {unread > 0 && !isDnd && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
                style={{ background: '#ef4444', lineHeight: 1 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed so it escapes sidebar overflow */}
      {open && (
        <div ref={ref}
             style={{
               position: 'fixed',
               top: pos.top,
               left: Math.max(8, Math.min(pos.left, window.innerWidth - 348)),
               width: 340,
               maxHeight: '72dvh',
               background: 'var(--bg-card)',
               border: '1px solid var(--border)',
               boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
               borderRadius: 16,
               overflow: 'hidden',
               display: 'flex',
               flexDirection: 'column',
               zIndex: 9999,
             }}>

          {/* Header */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0"
               style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: 'var(--accent-3)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Notificações</span>
              {unread > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                  {unread} nova{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <DndPicker dndUntil={dndUntil} onActivate={activateDnd} onDeactivate={deactivateDnd} />
              {notifications.length > 0 && (
                <button onClick={clearAll} title="Limpar todas"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2"
                   style={{ color: 'var(--text-muted)' }}>
                <Bell size={28} className="opacity-25" />
                <p className="text-xs">Nenhuma notificação ainda</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {notifications.map(n => (
                  <NotifRow
                    key={n.id} n={n}
                    onRead={markRead}
                    onDelete={deleteNotif}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
