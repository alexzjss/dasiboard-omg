import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import type { User } from '../../auth/types'
import { CountBadge } from '../../components/CountBadge'
import type { EventDto } from '../../lib/eventsApi'
import { saveCalendarFilters } from '../../lib/storage'
import { SegmentedControl } from '../perfil/SegmentedControl'
import { useSchedule } from '../home/useSchedule'
import { AgendaList } from './AgendaList'
import { CalendarFilters } from './CalendarFilters'
import { addDays, compareEvents, jupiterWeekdayOfKey, monthKey, monthOfKey, monthTitle, shiftMonth, todayKey, type MonthRef } from './calendarFormat'
import { agendaRange, eventDays, monthGridRange, saoPauloDateKey } from './dateRange'
import { DayList } from './DayList'
import { EventDetailPanel } from './EventDetailPanel'
import { eventPassesFilters, initialFilters, type CalendarFilters as Filters } from './filters'
import { useEvents } from './hooks/useEvents'
import { useReviewCount } from './hooks/useReviewCount'
import { groupClassesByWeekday } from './calendarGrouping'
import { MonthGrid } from './MonthGrid'
import { MyEventsPlaceholder, ReviewQueuePlaceholder } from './TabPlaceholders'

type PageTab = 'calendario' | 'minhas' | 'revisar'
type View = 'month' | 'agenda'

const VIEW_OPTIONS = [{ value: 'month', label: 'Mês' }, { value: 'agenda', label: 'Agenda' }] as const
const AGENDA_DAYS = 30
const NO_CLASSES: ReturnType<typeof groupClassesByWeekday> = Array.from({ length: 7 }, () => [])

export function CalendarioPage() {
  const { user } = useAuth()
  if (!user) return null
  return <CalendarioContent user={user} />
}

function CalendarioContent({ user }: { user: User }) {
  const [params, setParams] = useSearchParams()
  const { schedule } = useSchedule(user)
  const { count: reviewCount, reload: reloadReviewCount } = useReviewCount()

  const [view, setView] = useState<View>('month')
  const [month, setMonth] = useState<MonthRef>(() => monthOfKey(todayKey()))
  const [selectedDay, setSelectedDay] = useState(() => todayKey())
  const [filters, setFilters] = useState<Filters>(initialFilters)

  const today = todayKey()
  const range = useMemo(
    () => (view === 'month' ? monthGridRange(month.year, month.month) : agendaRange(new Date(), AGENDA_DAYS)),
    [view, month.year, month.month],
  )
  const { events, loading, error, reload } = useEvents(range, { otherClasses: filters.others })

  const eventId = params.get('evento')
  const selectedEvent = eventId ? events.find((e) => e.id === eventId) ?? null : null
  const moderates = reviewCount > 0 || events.some((e) => e.permissions.moderate)

  const tabs: { id: PageTab; label: string; badge?: number }[] = [
    { id: 'calendario', label: 'Calendário' },
    { id: 'minhas', label: 'Minhas submissões' },
    ...(moderates ? [{ id: 'revisar' as const, label: 'Para revisar', badge: reviewCount }] : []),
  ]
  const requestedTab = params.get('aba')
  const tab: PageTab = tabs.some((t) => t.id === requestedTab) ? (requestedTab as PageTab) : 'calendario'

  const myCodes = useMemo(() => new Set(schedule.map((s) => s.code)), [schedule])
  const visibleEvents = useMemo(
    () => events.filter((e) => eventPassesFilters(e, filters, myCodes)).sort(compareEvents),
    [events, filters, myCodes],
  )
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDto[]>()
    for (const event of visibleEvents) {
      for (const key of eventDays(event)) {
        const list = map.get(key)
        if (list) list.push(event)
        else map.set(key, [event])
      }
    }
    return map
  }, [visibleEvents])
  const classesByWeekday = useMemo(() => (filters.classes ? groupClassesByWeekday(schedule) : NO_CLASSES), [filters.classes, schedule])

  const selectEvent = useCallback((event: EventDto) => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.set('evento', event.id); return next })
  }, [setParams])
  const closeEvent = useCallback(() => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('evento'); return next })
  }, [setParams])
  const selectTab = (next: PageTab) => {
    setParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('evento')
      if (next === 'calendario') params.delete('aba')
      else params.set('aba', next)
      return params
    })
  }

  function changeFilters(next: Filters) {
    setFilters(next)
    saveCalendarFilters(next)
  }

  function goToMonth(next: MonthRef) {
    setMonth(next)
    const current = monthOfKey(today)
    setSelectedDay(next.year === current.year && next.month === current.month ? today : monthKey(next))
  }

  function selectDay(key: string) {
    setSelectedDay(key)
    const ref = monthOfKey(key)
    if (ref.year !== month.year || ref.month !== month.month) setMonth(ref)
  }

  // ?evento=<id> aberto direto (notificação): ainda não há rota para buscar um evento por id, então, se ele não está
  // no período carregado, voltamos ao mês de hoje uma única vez. Achado, seleciona o dia dele na grade.
  const fallbackFor = useRef<string | null>(null)
  useEffect(() => {
    if (!eventId || loading || error || selectedEvent || fallbackFor.current === eventId) return
    fallbackFor.current = eventId
    setView('month')
    setMonth(monthOfKey(todayKey()))
    setSelectedDay(todayKey())
  }, [eventId, loading, error, selectedEvent])
  const selectedEventId = selectedEvent?.id
  const selectedEventStart = selectedEvent?.startsAt
  useEffect(() => {
    if (selectedEventStart) setSelectedDay(saoPauloDateKey(selectedEventStart))
  }, [selectedEventId, selectedEventStart])

  const agendaFrom = saoPauloDateKey(range.from.toISOString())
  const agendaTo = addDays(agendaFrom, AGENDA_DAYS)
  const isCurrentMonth = month.year === monthOfKey(today).year && month.month === monthOfKey(today).month

  return (
    <main className="com-content cal-page">
      <header className="com-heading cal-head">
        <h1>Calendário</h1>
      </header>

      <div className="com-tabs" role="tablist" aria-label="Seções do calendário">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`cal-tab-${t.id}`}
            className="com-tab"
            aria-selected={tab === t.id}
            aria-controls={`cal-panel-${t.id}`}
            aria-label={t.badge ? `${t.label}, ${t.badge} para revisar` : undefined}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
            {t.badge ? <span className="cal-tab-badge"><CountBadge count={t.badge} /></span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`cal-panel-${tab}`} aria-labelledby={`cal-tab-${tab}`}>
        {tab === 'minhas' && <MyEventsPlaceholder onSelectEvent={selectEvent} />}
        {tab === 'revisar' && <ReviewQueuePlaceholder onChanged={reloadReviewCount} />}
        {tab === 'calendario' && (
          <>
            <div className="cal-toolbar">
              {view === 'month' ? (
                <div className="cal-nav">
                  <button type="button" className="com-btn cal-arrow" aria-label="Mês anterior" onClick={() => goToMonth(shiftMonth(month, -1))}>‹</button>
                  <h2 className="cal-month" aria-live="polite">{monthTitle(month)}</h2>
                  <button type="button" className="com-btn cal-arrow" aria-label="Próximo mês" onClick={() => goToMonth(shiftMonth(month, 1))}>›</button>
                  <button type="button" className="com-btn" disabled={isCurrentMonth && selectedDay === today} onClick={() => goToMonth(monthOfKey(today))}>Hoje</button>
                </div>
              ) : (
                <h2 className="cal-month">Próximos {AGENDA_DAYS} dias</h2>
              )}
              <span id="cal-view-label" className="sr-only">Visão do calendário</span>
              <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} labelledBy="cal-view-label" />
            </div>

            <CalendarFilters filters={filters} onChange={changeFilters} />

            {error ? (
              <div className="cal-error" role="alert">
                <p>Não foi possível carregar o calendário.</p>
                <button type="button" className="com-btn" onClick={reload}>Tentar de novo</button>
              </div>
            ) : (
              <div className="cal-body" aria-busy={loading}>
                {loading && <p className="com-muted cal-loading" role="status">Carregando…</p>}
                {view === 'month' ? (
                  <>
                    <MonthGrid
                      month={month}
                      today={today}
                      eventsByDay={eventsByDay}
                      classesByWeekday={classesByWeekday}
                      selectedDay={selectedDay}
                      onSelectDay={selectDay}
                    />
                    <DayList
                      dayKey={selectedDay}
                      events={eventsByDay.get(selectedDay) ?? []}
                      classes={classesByWeekday[jupiterWeekdayOfKey(selectedDay)]}
                      selectedEventId={selectedEventId}
                      onSelectEvent={selectEvent}
                    />
                  </>
                ) : (
                  !loading && <AgendaList events={visibleEvents} fromKey={agendaFrom} toKey={agendaTo} selectedEventId={selectedEventId} onSelectEvent={selectEvent} />
                )}
              </div>
            )}

            {selectedEvent && <EventDetailPanel event={selectedEvent} onClose={closeEvent} />}
          </>
        )}
      </div>
    </main>
  )
}
