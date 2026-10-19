import { getCurrentWeekDays } from '../../lib/date'
import type { ScheduleEntry } from './types'

export function ScheduleBoard({ schedule }: { schedule: ScheduleEntry[] }) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const days = getCurrentWeekDays()

  return (
    <div className="calendar-board home-calendar-board" aria-label="Grade horária semanal">
      {days.map((day, dayIndex) => (
        <article className={`calendar-day${dayIndex === todayIndex ? ' today' : ''}`} key={day.label}>
          <header>
            <div><strong>{day.label}</strong><span>{day.date}</span></div>
            <small>{schedule.filter((e) => e.weekday === dayIndex).length} aulas</small>
          </header>
          <div className="calendar-day-list">
            {schedule.filter((e) => e.weekday === dayIndex).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((entry) => (
              <div className="calendar-event" key={`${day.label}-${entry.code}-${entry.startsAt}`}>
                <span className="calendar-event-time">{entry.startsAt}</span>
                <div><strong>{entry.title}</strong><small>{entry.endsAt}{entry.room ? ` · ${entry.room}` : ''}</small></div>
              </div>
            ))}
            {!schedule.some((e) => e.weekday === dayIndex) && <p className="calendar-empty">Livre</p>}
          </div>
        </article>
      ))}
    </div>
  )
}
