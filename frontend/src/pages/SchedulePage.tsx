// ── Cronograma Semanal — timetable visual integrado ao calendário ─────────────
import { useState, useEffect, useMemo } from 'react'
import { format, startOfWeek, addDays, parseISO, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Clock, MapPin, X, BookOpen } from 'lucide-react'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface Event {
  id: string; title: string; event_type: string
  start_at: string; end_at?: string; all_day: boolean
  color: string; location?: string; class_code?: string
}
interface Subject {
  id: string; code: string; name: string; color: string; semester: string
}

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07h–21h

function timeToMinutes(iso: string): number {
  const d = parseISO(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function minutesToPx(minutes: number, pxPerHour = 64): number {
  return (minutes / 60) * pxPerHour
}

// ── Day column with event blocks ──────────────────────────────────────────────
function DayColumn({
  date, events, subjects, isToday, onEventClick
}: {
  date: Date
  events: Event[]
  subjects: Subject[]
  isToday: boolean
  onEventClick: (e: Event) => void
}) {
  const PX_PER_HOUR = 64
  const START_HOUR  = 7

  return (
    <div className="flex-1 relative min-w-0" style={{ minWidth: 80 }}>
      {/* Hour grid lines */}
      {HOURS.map(h => (
        <div key={h} style={{
          position: 'absolute',
          top: (h - START_HOUR) * PX_PER_HOUR,
          left: 0, right: 0, height: PX_PER_HOUR,
          borderTop: '1px solid var(--border)',
          opacity: 0.4,
          pointerEvents: 'none',
        }} />
      ))}

      {/* All-day events */}
      {events.filter(e => e.all_day).map(e => (
        <button
          key={e.id}
          onClick={() => onEventClick(e)}
          className="w-full text-left px-1.5 py-0.5 mb-0.5 rounded text-[10px] font-semibold truncate transition-all hover:opacity-80"
          style={{ background: e.color + '33', color: e.color, border: `1px solid ${e.color}55` }}
        >
          {e.title}
        </button>
      ))}

      {/* Timed events — absolute positioned */}
      {events.filter(e => !e.all_day).map(e => {
        const startMins = timeToMinutes(e.start_at) - START_HOUR * 60
        const endMins   = e.end_at ? timeToMinutes(e.end_at) - START_HOUR * 60 : startMins + 60
        const top       = minutesToPx(Math.max(0, startMins), PX_PER_HOUR)
        const height    = Math.max(22, minutesToPx(endMins - startMins, PX_PER_HOUR))
        const sub = subjects.find(s => s.code === e.class_code)

        return (
          <button
            key={e.id}
            onClick={() => onEventClick(e)}
            className="absolute left-0.5 right-0.5 rounded-lg text-left overflow-hidden transition-all hover:opacity-90 hover:z-10"
            style={{
              top, height,
              background: e.color + '22',
              border: `1.5px solid ${e.color}66`,
              borderLeft: `3px solid ${e.color}`,
              zIndex: 1,
            }}
          >
            <div className="px-1.5 py-0.5">
              <p className="text-[9px] font-bold leading-tight truncate" style={{ color: e.color }}>
                {e.title}
              </p>
              {height > 32 && (
                <p className="text-[8px] leading-tight" style={{ color: e.color, opacity: 0.7 }}>
                  {format(parseISO(e.start_at), 'HH:mm')}
                  {e.location && ` · ${e.location}`}
                </p>
              )}
            </div>
          </button>
        )
      })}

      {/* Today highlight */}
      {isToday && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'var(--accent-soft)',
          opacity: 0.08,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

// ── Event detail popup ────────────────────────────────────────────────────────
function EventDetail({ event, onClose }: { event: Event; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl animate-in"
           style={{ background: 'var(--bg-card)', border: `1px solid ${event.color}44`, boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${event.color}22` }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        {/* Color band */}
        <div className="h-1.5 rounded-t-full mx-4 mt-3 mb-4" style={{ background: event.color }} />
        <div className="px-5 pb-6 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: event.color + '20', color: event.color }}>
                {TYPE_LABELS[event.event_type] ?? event.event_type}
              </span>
              <h3 className="font-display font-bold text-lg mt-1.5 leading-tight" style={{ color: 'var(--text-primary)' }}>
                {event.title}
              </h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {!event.all_day && (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={13} style={{ flexShrink: 0 }} />
                <span className="text-sm">
                  {format(parseISO(event.start_at), "EEEE, d 'de' MMMM · HH:mm", { locale: ptBR })}
                  {event.end_at && ` – ${format(parseISO(event.end_at), 'HH:mm')}`}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                <span className="text-sm">{event.location}</span>
              </div>
            )}
            {event.class_code && (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen size={13} style={{ flexShrink: 0 }} />
                <span className="text-sm font-mono">{event.class_code}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main SchedulePage ─────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [events,    setEvents]    = useState<Event[]>([])
  const [subjects,  setSubjects]  = useState<Subject[]>([])
  const [selected,  setSelected]  = useState<Event | null>(null)
  const [loading,   setLoading]   = useState(true)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today    = new Date()

  useEffect(() => {
    const from = weekStart.toISOString()
    const to   = addDays(weekStart, 7).toISOString()
    setLoading(true)
    Promise.all([
      api.get('/events/', { params: { start: from, end: to } }),
      api.get('/grades/subjects').catch(() => ({ data: [] })),
    ])
      .then(([evRes, subRes]) => {
        setEvents(evRes.data)
        setSubjects(subRes.data)
      })
      .catch(() => toast.error('Erro ao carregar cronograma'))
      .finally(() => setLoading(false))
  }, [weekStart])

  const eventsByDay = useMemo(() => {
    const map: Record<string, Event[]> = {}
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd')
      map[key] = events.filter(e => isSameDay(parseISO(e.start_at), day))
    }
    return map
  }, [events, weekDays])

  const PX_PER_HOUR = 64
  const START_HOUR  = 7
  const TOTAL_HEIGHT = HOURS.length * PX_PER_HOUR

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px - 60px)' }}>

      {/* Header */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between gap-3"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div>
          <h1 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays size={18} style={{ color: 'var(--accent-3)' }} />
            Cronograma
          </h1>
          <p className="text-[11px] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
            {format(weekStart, "'Semana de' d 'de' MMMM", { locale: ptBR })} –{' '}
            {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(s => subWeeks(s, 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: 0 }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
            Hoje
          </button>
          <button onClick={() => setWeekStart(s => addWeeks(s, 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Subject legend */}
      {subjects.length > 0 && (
        <div className="px-4 py-1.5 shrink-0 flex gap-2 overflow-x-auto scrollbar-hide"
             style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {subjects.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.code}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timetable grid */}
      <div className="flex-1 overflow-auto" data-no-swipe>
        <div className="flex" style={{ minWidth: 560 }}>
          {/* Hour labels column */}
          <div className="shrink-0 w-12" style={{ paddingTop: 48 }}>
            {HOURS.map(h => (
              <div key={h} className="flex items-start justify-end pr-2"
                   style={{ height: PX_PER_HOUR }}>
                <span className="text-[9px] font-mono -translate-y-1.5" style={{ color: 'var(--text-muted)' }}>
                  {String(h).padStart(2, '0')}h
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 gap-0">
            {weekDays.map((day, i) => {
              const key       = format(day, 'yyyy-MM-dd')
              const isToday_d = isSameDay(day, today)
              const dayEvents = eventsByDay[key] ?? []

              return (
                <div key={key} className="flex-1 flex flex-col" style={{ minWidth: 80, borderLeft: '1px solid var(--border)' }}>
                  {/* Day header */}
                  <div className="h-12 flex flex-col items-center justify-center shrink-0 sticky top-0 z-10"
                       style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[10px] font-semibold uppercase"
                          style={{ color: isToday_d ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                      {DAYS_SHORT[i]}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                         style={{
                           background: isToday_d ? 'var(--accent-1)' : 'transparent',
                           color: isToday_d ? 'white' : 'var(--text-primary)',
                         }}>
                      <span className="text-xs font-bold">{format(day, 'd')}</span>
                    </div>
                  </div>

                  {/* Events area */}
                  <div className="relative flex-1" style={{ height: TOTAL_HEIGHT }}>
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full border-2 animate-spin"
                             style={{ borderColor: 'var(--accent-1)', borderTopColor: 'transparent' }} />
                      </div>
                    ) : (
                      <DayColumn
                        date={day}
                        events={dayEvents}
                        subjects={subjects}
                        isToday={isToday_d}
                        onEventClick={setSelected}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Event detail */}
      {selected && <EventDetail event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
