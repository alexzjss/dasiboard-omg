import type { CSSProperties } from 'react'
import { DAY_END, DAY_START, assignLanes, formatMinutes, minutesOf, roomLabel, toSlots, weekdayIndex } from './scheduleTime'
import type { ScheduleEntry } from './types'

const SPAN = DAY_END - DAY_START
const pct = (minutes: number) => ((minutes - DAY_START) / SPAN) * 100
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7)

function summarize(slots: ReturnType<typeof toSlots>, nowMin: number, weekday: number, hasSchedule: boolean) {
  if (!hasSchedule) return null
  if (weekday > 4) return 'Fim de semana: sem aula na grade. Aproveita.'
  if (slots.length === 0) return 'Hoje não tem aula. Dia livre.'
  const current = slots.find((s) => nowMin >= s.start && nowMin < s.end)
  if (current) return `Rolando agora: ${current.code}, até ${formatMinutes(current.end)}${roomLabel(current) ? ` (${roomLabel(current)})` : ''}.`
  const next = slots.find((s) => s.start > nowMin)
  if (next) return `Próxima: ${next.code} às ${formatMinutes(next.start)}${roomLabel(next) ? `, ${roomLabel(next)}` : ''}.`
  return 'Acabou por hoje. Bom descanso.'
}

/** "Órbita do dia": linha do tempo 07h–23h, horizontal no desktop e vertical no celular. */
export function DayOrbit({ schedule, now, hasSchedule }: { schedule: ScheduleEntry[]; now: Date; hasSchedule: boolean }) {
  const weekday = weekdayIndex(now)
  const nowMin = minutesOf(now)
  const slots = weekday > 4 ? [] : toSlots(schedule.filter((e) => e.weekday === weekday))
  const summary = summarize(slots, nowMin, weekday, hasSchedule)
  const nowInRange = nowMin >= DAY_START && nowMin <= DAY_END

  return (
    <section className={`section-block orbit${hasSchedule ? '' : ' is-empty'}`} aria-labelledby="orbit-title">
      <div className="orbit-head">
        <h2 id="orbit-title">Hoje</h2>
        <p className="orbit-summary" aria-live="polite">
          {summary ?? <>Sem grade ainda. <a href="#importar">Importa do JupiterWeb</a> e suas aulas aparecem aqui.</>}
        </p>
      </div>
      <div className="orbit-plane">
        <div className="orbit-line" aria-hidden="true" />
        {HOURS.map((h) => (
          <div key={h} className={`orbit-tick${h % 2 === 1 ? ' is-major' : ''}${Math.abs(h * 60 - nowMin) < 30 ? ' is-near-now' : ''}`} style={{ '--p': pct(h * 60) } as CSSProperties} aria-hidden="true">
            <span className="mono">{String(h).padStart(2, '0')}</span>
          </div>
        ))}
        <ol className="orbit-segments" aria-label="Aulas de hoje">
          {assignLanes(slots).map((slot) => {
            const isNow = nowMin >= slot.start && nowMin < slot.end
            const isPast = nowMin >= slot.end
            const room = roomLabel(slot)
            const from = Math.max(slot.start, DAY_START)
            const to = Math.min(slot.end, DAY_END)
            return (
              <li
                key={`${slot.code}-${slot.start}`}
                className={`orbit-seg${isNow ? ' is-now' : ''}${isPast ? ' is-past' : ''}`}
                style={{ '--p0': pct(from), '--len': pct(to) - pct(from), '--lane': slot.lane, '--lanes': slot.lanes } as CSSProperties}
                title={`${slot.code} · ${slot.title}`}
              >
                <span className="orbit-seg-code mono">{slot.code}</span>
                <span className="orbit-seg-title">{slot.title}</span>
                <span className="orbit-seg-time mono">{slot.startsAt}–{slot.endsAt}{room ? ` · ${room}` : ''}</span>
                {isNow && <span className="sr-only"> (acontecendo agora)</span>}
              </li>
            )
          })}
        </ol>
        {nowInRange && (
          <div className="orbit-now" style={{ '--p': pct(nowMin) } as CSSProperties} aria-hidden="true">
            <span className="orbit-now-label mono"><span className="orbit-now-word">agora </span>{formatMinutes(nowMin)}</span>
          </div>
        )}
      </div>
    </section>
  )
}
