// Helpers puros do calendário. Tudo em America/Sao_Paulo: o Brasil não tem horário de verão desde 2019,
// então o offset é fixo (-03:00) e não depende do fuso do navegador.

const DAY_MS = 86_400_000
const SP_OFFSET_MS = 3 * 3_600_000
const SP_OFFSET = '-03:00'

/** Horário de parede de São Paulo, guardado num Date em UTC (use os getters UTC). */
function wallClock(instant: Date): Date {
  return new Date(instant.getTime() - SP_OFFSET_MS)
}

/** Instante da meia-noite de um dia de São Paulo. Dias fora do mês são normalizados pelo Date.UTC. */
function spMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) + SP_OFFSET_MS)
}

function dayKeyOf(wall: Date): string {
  return wall.toISOString().slice(0, 10)
}

function shiftKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/**
 * Intervalo do grid mensal: 6 semanas começando no domingo. `month` é 0-based, como em Date.
 * `from` é a meia-noite do primeiro domingo; `to` é exclusivo (meia-noite depois da última célula).
 */
export function monthGridRange(year: number, month: number): { from: Date; to: Date } {
  const weekdayOfFirst = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const firstCell = 1 - weekdayOfFirst
  return { from: spMidnight(year, month, firstCell), to: spMidnight(year, month, firstCell + 42) }
}

/** Intervalo da agenda: do início do dia de `today` por `days` dias (fim exclusivo). */
export function agendaRange(today: Date, days = 30): { from: Date; to: Date } {
  const wall = wallClock(today)
  const from = spMidnight(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate())
  return { from, to: new Date(from.getTime() + days * DAY_MS) }
}

/** ISO com offset de São Paulo, ex.: 2026-10-21T00:00:00.000-03:00. */
export function toApiIso(date: Date): string {
  return `${wallClock(date).toISOString().slice(0, -1)}${SP_OFFSET}`
}

/** Dia (YYYY-MM-DD) de um instante ISO, lido no fuso de São Paulo. */
export function saoPauloDateKey(iso: string): string {
  return dayKeyOf(wallClock(new Date(iso)))
}

/**
 * Dias (YYYY-MM-DD, em São Paulo) que o evento ocupa, do início ao fim, inclusive.
 * Em evento com horário, um fim exatamente à meia-noite não conta o dia seguinte.
 */
export function eventDays(event: { startsAt: string; endsAt: string | null; allDay: boolean }): string[] {
  const startKey = saoPauloDateKey(event.startsAt)
  let endKey = event.endsAt ? saoPauloDateKey(event.endsAt) : startKey
  if (event.endsAt && !event.allDay && isSaoPauloMidnight(event.endsAt) && Date.parse(event.endsAt) > Date.parse(event.startsAt)) {
    endKey = shiftKey(endKey, -1)
  }
  if (endKey < startKey) endKey = startKey
  const days: string[] = []
  for (let key = startKey; key <= endKey; key = shiftKey(key, 1)) days.push(key)
  return days
}

function isSaoPauloMidnight(iso: string): boolean {
  const wall = wallClock(new Date(iso))
  return wall.getUTCHours() === 0 && wall.getUTCMinutes() === 0 && wall.getUTCSeconds() === 0 && wall.getUTCMilliseconds() === 0
}
