// ── Relative time formatting — "há 2 horas", "ontem às 14:30", etc. ──────────
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Smart date format:
 * - Less than 1 hour ago: "há 45 minutos"
 * - Less than 24h, today: "hoje às 14:30"
 * - Yesterday: "ontem às 14:30"
 * - This year: "22 de março às 14:30"
 * - Older: "22 mar 2024"
 */
export function smartDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const now  = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  // Very recent
  if (diffMins < 2)  return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins} min`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24 && isToday(date))
    return `hoje às ${format(date, 'HH:mm')}`

  if (isYesterday(date))
    return `ontem às ${format(date, 'HH:mm')}`

  if (date.getFullYear() === now.getFullYear())
    return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })

  return format(date, "d MMM yyyy", { locale: ptBR })
}

/**
 * For event dates: shows the start time smartly
 * "hoje às 14:30" | "amanhã às 09:00" | "22 de março"
 */
export function eventDate(dateInput: string | Date, allDay = false): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const now  = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)

  if (isToday(date)) return allDay ? 'hoje' : `hoje às ${format(date, 'HH:mm')}`
  if (diffDays === 1) return allDay ? 'amanhã' : `amanhã às ${format(date, 'HH:mm')}`
  if (diffDays === -1) return allDay ? 'ontem' : `ontem às ${format(date, 'HH:mm')}`

  if (date.getFullYear() === now.getFullYear())
    return allDay
      ? format(date, "d 'de' MMMM", { locale: ptBR })
      : format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })

  return format(date, "d MMM yyyy", { locale: ptBR })
}
