// ── Central de Notificações ───────────────────────────────────────────────────
// Gerencia notificações in-app: conquistas, eventos, deadlines, digest semanal
// Persiste em localStorage e sincroniza via BroadcastChannel entre abas

import { useState, useEffect, useCallback, useRef } from 'react'
import { sendLocalNotification } from './usePushNotifications'

export type NotifKind =
  | 'achievement'   // conquista desbloqueada
  | 'event_soon'    // evento em breve
  | 'deadline'      // deadline de kanban
  | 'entity_mention'// menção em evento de entidade
  | 'weekly_digest' // resumo semanal
  | 'system'        // info do sistema

export interface AppNotification {
  id: string
  kind: NotifKind
  title: string
  body: string
  emoji: string
  href?: string       // rota para navegar ao clicar
  createdAt: string   // ISO
  readAt?: string
  entityColor?: string
}

const STORAGE_KEY  = 'dasiboard-notifications'
const DND_KEY      = 'dasiboard-dnd-until'    // ISO timestamp
const DIGEST_KEY   = 'dasiboard-digest-week'  // "YYYY-WW"

// ── Persistence ───────────────────────────────────────────────────────────────
function load(): AppNotification[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    // Keep last 50, prune old read ones (>7 days)
    const cutoff = Date.now() - 7*24*60*60*1000
    return raw.filter((n: AppNotification) =>
      !n.readAt || new Date(n.readAt).getTime() > cutoff
    ).slice(0, 50)
  } catch { return [] }
}
function persist(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)))
}

// ── DND helpers ───────────────────────────────────────────────────────────────
export function getDndUntil(): Date | null {
  const v = localStorage.getItem(DND_KEY)
  if (!v) return null
  const d = new Date(v)
  return d > new Date() ? d : null
}
export function setDnd(hours: number) {
  if (hours <= 0) { localStorage.removeItem(DND_KEY); return }
  const until = new Date(Date.now() + hours*3600*1000)
  localStorage.setItem(DND_KEY, until.toISOString())
}
export function isDndActive() { return !!getDndUntil() }

// ── Emit (called from anywhere in the app) ────────────────────────────────────
let _listeners: Array<(n: AppNotification) => void> = []

export function emitNotification(notif: Omit<AppNotification, 'id' | 'createdAt'>) {
  if (isDndActive()) return
  const full: AppNotification = {
    ...notif,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  // Persist
  const current = load()
  persist([full, ...current])
  // Notify listeners
  _listeners.forEach(fn => fn(full))
  // Also fire OS push notification if permitted
  sendLocalNotification(full.title, { body: full.body, tag: full.id })
}

// ── Weekly digest generation ─────────────────────────────────────────────────
function getISOWeek(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2,'0')}`
}

export function maybeEmitWeeklyDigest(stats: {
  pomodoroMinutes: number
  flashcardsAnswered: number
  flashcardsCorrect: number
  notesCreated: number
  streak: number
}) {
  const now = new Date()
  // Only on Monday (1) or first time this week
  const week = getISOWeek(now)
  if (localStorage.getItem(DIGEST_KEY) === week) return
  if (now.getDay() !== 1 && localStorage.getItem(DIGEST_KEY)) return // wait for Monday

  localStorage.setItem(DIGEST_KEY, week)

  const hours = Math.floor(stats.pomodoroMinutes / 60)
  const mins  = stats.pomodoroMinutes % 60
  const acc   = stats.flashcardsAnswered > 0
    ? Math.round((stats.flashcardsCorrect / stats.flashcardsAnswered) * 100)
    : 0

  const lines: string[] = []
  if (stats.pomodoroMinutes > 0) lines.push(`⏱️ ${hours}h${mins > 0 ? ` ${mins}m` : ''} de Pomodoro`)
  if (stats.flashcardsAnswered > 0) lines.push(`⚡ ${stats.flashcardsAnswered} flashcards (${acc}% acerto)`)
  if (stats.notesCreated > 0) lines.push(`📝 ${stats.notesCreated} nota${stats.notesCreated > 1 ? 's' : ''} criada${stats.notesCreated > 1 ? 's' : ''}`)
  if (stats.streak > 0) lines.push(`🔥 ${stats.streak} dia${stats.streak > 1 ? 's' : ''} seguido${stats.streak > 1 ? 's' : ''}`)

  emitNotification({
    kind: 'weekly_digest',
    title: '📊 Seu resumo semanal',
    body: lines.length > 0 ? lines.join(' · ') : 'Comece a estudar essa semana!',
    emoji: '📊',
    href: '/profile',
  })
}

// ── Deadline notifier (called from KanbanPage after load) ─────────────────────
export function scheduleDeadlineNotifs(
  cards: Array<{ id: string; title: string; due_date?: string; board_name?: string }>
) {
  if (isDndActive()) return
  const now = Date.now()
  const alerted = new Set<string>(
    JSON.parse(localStorage.getItem('dasiboard-alerted-deadlines') ?? '[]')
  )

  cards.forEach(card => {
    if (!card.due_date || alerted.has(card.id)) return
    const due  = new Date(card.due_date).getTime()
    const diff = due - now
    if (diff < 0) return // already past

    // Alert at: 24h before, 1h before
    const thresholds = [24*3600*1000, 3600*1000]
    thresholds.forEach(thresh => {
      const delay = diff - thresh
      if (delay > 0 && delay < 24*3600*1000) {
        setTimeout(() => {
          emitNotification({
            kind: 'deadline',
            title: `⏰ Deadline: ${card.title}`,
            body: thresh === 3600*1000
              ? 'Vence em 1 hora!'
              : 'Vence em 24 horas!',
            emoji: '⏰',
            href: '/kanban',
          })
        }, delay)
      }
    })

    alerted.add(card.id)
  })
  localStorage.setItem('dasiboard-alerted-deadlines', JSON.stringify([...alerted].slice(0, 200)))
}

// ── React hook ────────────────────────────────────────────────────────────────
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(load)
  const [dndUntil,      setDndUntil]      = useState<Date | null>(getDndUntil)

  // Listen for new notifications from emitNotification
  useEffect(() => {
    const fn = (n: AppNotification) => setNotifications(prev => {
      const next = [n, ...prev].slice(0, 50)
      persist(next)
      return next
    })
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(f => f !== fn) }
  }, [])

  // BroadcastChannel — sync across tabs
  useEffect(() => {
    const bc = new BroadcastChannel('dasiboard-notifs')
    bc.onmessage = () => setNotifications(load())
    return () => bc.close()
  }, [])

  const unread = notifications.filter(n => !n.readAt).length

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
      persist(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const now = new Date().toISOString()
      const next = prev.map(n => n.readAt ? n : { ...n, readAt: now })
      persist(next)
      return next
    })
  }, [])

  const deleteNotif = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id)
      persist(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    persist([])
  }, [])

  const activateDnd = useCallback((hours: number) => {
    setDnd(hours)
    setDndUntil(getDndUntil())
  }, [])

  const deactivateDnd = useCallback(() => {
    setDnd(0)
    setDndUntil(null)
  }, [])

  return {
    notifications,
    unread,
    markRead,
    markAllRead,
    deleteNotif,
    clearAll,
    dndUntil,
    activateDnd,
    deactivateDnd,
    isDnd: isDndActive(),
  }
}
