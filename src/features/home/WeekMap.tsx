import type { CSSProperties } from 'react'
import { getCurrentWeekDays } from '../../lib/date'
import { assignLanes, formatMinutes, minutesOf, roomLabel, toSlots, weekdayIndex } from './scheduleTime'
import type { ScheduleEntry } from './types'

/** Mapa compacto da semana: 5 colunas (seg a sex) × horários. */
export function WeekMap({ schedule, now, action }: { schedule: ScheduleEntry[]; now: Date; action?: React.ReactNode }) {
  const days = getCurrentWeekDays()
  const today = weekdayIndex(now)
  const nowMin = minutesOf(now)
  const slots = toSlots(schedule).filter((s) => s.weekday >= 0 && s.weekday <= 4)

  const firstHour = slots.length ? Math.max(0, Math.floor(Math.min(...slots.map((s) => s.start)) / 60)) : 8
  const lastHour = Math.min(23, Math.max(firstHour + 4, slots.length ? Math.ceil(Math.max(...slots.map((s) => s.end)) / 60) : 18))
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i)
  const nowOffset = nowMin - firstHour * 60
  const showNow = today <= 4 && nowOffset >= 0 && nowOffset <= (lastHour - firstHour) * 60

  return (
    <section className="section-block week" aria-labelledby="week-title">
      <div className="week-head">
        <h2 id="week-title">Semana</h2>
        {action}
      </div>
      <div className="week-map" style={{ '--rows': hours.length } as CSSProperties}>
        <div className="week-corner" aria-hidden="true" />
        {days.map((day, i) => (
          <div key={day.label} className={`week-day-head${i === today ? ' is-today' : ''}`}>
            <span>{day.label}</span><span className="mono">{day.date}</span>
          </div>
        ))}
        <div className="week-hours" aria-hidden="true">
          {hours.map((h) => <span key={h} className="mono">{String(h).padStart(2, '0')}</span>)}
        </div>
        {days.map((day, i) => {
          const daySlots = assignLanes(slots.filter((s) => s.weekday === i))
          return (
            <ol key={day.label} className={`week-col${i === today ? ' is-today' : ''}`} aria-label={`${day.label}, dia ${day.date}`}>
              {daySlots.map((slot) => {
                const isNow = i === today && nowMin >= slot.start && nowMin < slot.end
                const room = roomLabel(slot)
                return (
                  <li
                    key={`${slot.code}-${slot.start}`}
                    className={`week-event${isNow ? ' is-now' : ''}`}
                    style={{ '--t': slot.start - firstHour * 60, '--d': slot.end - slot.start, '--lane': slot.lane, '--lanes': slot.lanes } as CSSProperties}
                    title={`${slot.code} · ${slot.title}`}
                  >
                    <span className="week-event-code mono">{slot.code}</span>
                    {room && <span className="week-event-room mono">{room}</span>}
                    <span className="sr-only">{slot.title}, {formatMinutes(slot.start)} às {formatMinutes(slot.end)}</span>
                  </li>
                )
              })}
              {daySlots.length === 0 && <li className="sr-only">Sem aulas</li>}
              {i === today && showNow && <li className="week-now" style={{ '--t': nowOffset } as CSSProperties} aria-hidden="true" />}
            </ol>
          )
        })}
      </div>
    </section>
  )
}
