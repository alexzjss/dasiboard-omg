const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60],
]

/** "há 3 horas", "ontem"... em pt-BR. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000
  if (Number.isNaN(diff)) return ''
  for (const [unit, secs] of STEPS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return 'agora mesmo'
}
