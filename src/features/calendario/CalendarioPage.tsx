import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import type { User } from '../../auth/types'
import { CountBadge } from '../../components/CountBadge'
import { fetchEvent, type EventDto } from '../../lib/eventsApi'
import { saveCalendarFilters } from '../../lib/storage'
import { SegmentedControl } from '../perfil/SegmentedControl'
import { useSchedule } from '../home/useSchedule'
import { AgendaList } from './AgendaList'
import { CalendarFilters } from './CalendarFilters'
import { addDays, compareEvents, jupiterWeekdayOfKey, monthKey, monthOfKey, monthTitle, shiftMonth, todayKey, type MonthRef } from './calendarFormat'
import { agendaRange, eventDays, monthGridRange, saoPauloDateKey } from './dateRange'
import { DayList } from './DayList'
import { EventDetail } from './EventDetail'
import { EventForm } from './EventForm'
import { eventPassesFilters, initialFilters, type CalendarFilters as Filters } from './filters'
import { useEvents } from './hooks/useEvents'
import { useReviewCount } from './hooks/useReviewCount'
import { groupClassesByWeekday } from './calendarGrouping'
import { MonthGrid } from './MonthGrid'
import { MyEvents } from './MyEvents'
import { ReviewQueue } from './ReviewQueue'

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
  const { count: reviewCount, moderates, reload: reloadReviewCount } = useReviewCount()

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
  // Evento aberto por ?evento=<id> fora do período carregado: vem de GET /api/events/:id.
  const [fetched, setFetched] = useState<EventDto | null>(null)
  const [proposing, setProposing] = useState(false)
  const [proposeScope, setProposeScope] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [mineVersion, setMineVersion] = useState(0)
  const selectedEvent = eventId ? events.find((e) => e.id === eventId) ?? (fetched?.id === eventId ? fetched : null) : null

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

  // ?propor=<entidade> (atalho na página da entidade): abre o formulário com o escopo escolhido e tira o parâmetro da URL.
  const proposeParam = params.get('propor')
  useEffect(() => {
    if (!proposeParam) return
    setProposeScope(proposeParam)
    setProposing(true)
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('propor'); return next }, { replace: true })
  }, [proposeParam, setParams])

  const changed = useCallback((message?: string) => {
    reload()
    setMineVersion((v) => v + 1)
    reloadReviewCount()
    if (message) setNotice(message)
  }, [reload, reloadReviewCount])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

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

  // ?evento=<id> aberto direto (notificação): se não está no período carregado, busca por id, vai para o mês
  // dele e abre o detalhe. Se não existe ou não é visível, tira o parâmetro da URL.
  const fetchedFor = useRef<string | null>(null)
  useEffect(() => { if (!eventId) setFetched(null) }, [eventId])
  useEffect(() => {
    if (!eventId || loading || error || selectedEvent || fetchedFor.current === eventId) return
    fetchedFor.current = eventId
    const controller = new AbortController()
    fetchEvent(eventId, { otherClasses: filters.others }, controller.signal).then(
      (found) => {
        if (controller.signal.aborted) return
        setFetched(found)
        if (params.get('aba')) return
        const day = saoPauloDateKey(found.startsAt)
        setView('month')
        setMonth(monthOfKey(day))
        setSelectedDay(day)
      },
      (err: unknown) => {
        if (controller.signal.aborted) return
        fetchedFor.current = null
        if (!(err instanceof DOMException)) closeEvent()
      },
    )
    return () => { controller.abort(); if (fetchedFor.current === eventId) fetchedFor.current = null }
  }, [eventId, loading, error, selectedEvent, filters.others, closeEvent, params])
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
        <button type="button" className="com-btn cal-primary" onClick={() => setProposing(true)}>Propor evento</button>
      </header>
      {notice && <p className="cal-toast" role="status">{notice}</p>}

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
        {tab === 'minhas' && <MyEvents onSelectEvent={selectEvent} onPropose={() => setProposing(true)} version={mineVersion} />}
        {tab === 'revisar' && <ReviewQueue onChanged={reloadReviewCount} entityId={params.get('entidade')} />}
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

          </>
        )}
      </div>

      {selectedEvent && <EventDetail key={selectedEvent.id} event={selectedEvent} onClose={closeEvent} onChanged={changed} />}
      {proposing && <EventForm
        initialScope={proposeScope ? { scope: 'entity', scopeValue: proposeScope } : undefined}
        onClose={() => { setProposing(false); setProposeScope(null) }}
        onSaved={(message) => { setProposing(false); setProposeScope(null); changed(message) }}
      />}
    </main>
  )
}
