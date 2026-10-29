// Gerador puro de iCalendar (RFC 5545) para o feed assinável do calendário.
import { toSaoPauloDate } from './validation.js'
import type { EventKind, EventRecord } from './types.js'

export type IcsEvent = Pick<EventRecord, 'id' | 'title' | 'description' | 'kind' | 'startsAt' | 'endsAt' | 'allDay' | 'location' | 'link'> & { scopeLabel?: string }
export type IcsClass = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; room?: string; building?: string }

const KIND_LABEL: Record<EventKind, string> = {
  event: 'Evento', meeting: 'Reunião', exam: 'Prova', assignment: 'Entrega', deadline: 'Prazo', holiday: 'Feriado/sem aula',
}
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const RECURRENCE_DAYS = 120
const TZID = 'America/Sao_Paulo'

export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

// Linhas de no máximo 75 octetos; as continuações começam com um espaço (que também conta).
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = Buffer.byteLength(char, 'utf8')
    const limit = parts.length === 0 ? 75 : 74
    if (size + bytes > limit) { parts.push(current); current = ''; size = 0 }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const compactDate = (isoDate: string) => isoDate.replace(/-/g, '')
const addDays = (isoDate: string, days: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

function eventLines(event: IcsEvent, stamp: string): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${event.id}@dasiboard`, `DTSTAMP:${stamp}`]
  if (event.allDay) {
    const first = toSaoPauloDate(event.startsAt)
    const lastRaw = event.endsAt ? toSaoPauloDate(event.endsAt) : first
    const last = lastRaw < first ? first : lastRaw
    lines.push(`DTSTART;VALUE=DATE:${compactDate(first)}`, `DTEND;VALUE=DATE:${compactDate(addDays(last, 1))}`)
  } else {
    const start = Date.parse(event.startsAt)
    const end = event.endsAt ? Date.parse(event.endsAt) : start + HOUR_MS
    lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end > start ? end : start + HOUR_MS)}`)
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`)
  const meta = `Tipo: ${KIND_LABEL[event.kind]}${event.scopeLabel ? ` · Escopo: ${event.scopeLabel}` : ''}`
  lines.push(`DESCRIPTION:${escapeText(event.description ? `${event.description}\n${meta}` : meta)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.link && /^https:\/\//i.test(event.link)) lines.push(`URL:${event.link.replace(/[\r\n]/g, '')}`)
  lines.push('END:VEVENT')
  return lines
}

// 0 = segunda ... 6 = domingo (mesma convenção da grade horária). Devolve a data (SP) da próxima ocorrência, hoje incluído.
function nextOccurrence(now: Date, weekday: number): string {
  const today = toSaoPauloDate(now.toISOString())
  const todayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(today, (weekday - todayIndex + 7) % 7)
}

const localStamp = (isoDate: string, time: string) => `${compactDate(isoDate)}T${time.replace(':', '')}00`

function classLines(entry: IcsClass, now: Date, stamp: string, until: string): string[] {
  const date = nextOccurrence(now, entry.weekday)
  const summary = entry.title && entry.title !== entry.code ? `${entry.code} - ${entry.title}` : entry.code || entry.title
  const location = [entry.room, entry.building].filter(Boolean).join(' - ')
  const lines = [
    'BEGIN:VEVENT',
    `UID:class-${entry.code}-${entry.weekday}-${entry.startsAt}@dasiboard`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZID}:${localStamp(date, entry.startsAt)}`,
    `DTEND;TZID=${TZID}:${localStamp(date, entry.endsAt)}`,
    `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
    `SUMMARY:${escapeText(summary)}`,
  ]
  if (location) lines.push(`LOCATION:${escapeText(location)}`)
  lines.push('END:VEVENT')
  return lines
}

const TIMEZONE = [
  'BEGIN:VTIMEZONE', `TZID:${TZID}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
]

export function buildIcs(input: { calendarName: string; events: IcsEvent[]; classes: IcsClass[]; now: Date }): string {
  const { calendarName, events, classes, now } = input
  const stamp = utc(now.getTime())
  const until = utc(now.getTime() + RECURRENCE_DAYS * DAY_MS)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dasiboard//Calendario//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`, `X-WR-TIMEZONE:${TZID}`,
  ]
  if (classes.length > 0) lines.push(...TIMEZONE)
  for (const event of events) lines.push(...eventLines(event, stamp))
  for (const entry of classes) lines.push(...classLines(entry, now, stamp, until))
  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
