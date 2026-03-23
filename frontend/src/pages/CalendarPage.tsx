import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  format, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO, addDays, addWeeks, subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays,
  Trash2, Globe, Filter, KeyRound, CalendarRange,
  Clock, MapPin, BookOpen, Pencil, Download, Repeat,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { smartDate } from '@/utils/formatRelative'
import api from '@/utils/api'
import clsx from 'clsx'
import { useEventReminders } from '@/hooks/usePushNotifications'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'

interface Event {
  id: string; title: string; description?: string
  event_type: string; start_at: string; end_at?: string
  all_day: boolean; color: string; location?: string
  class_code?: string; is_global?: boolean
  entity_id?: string; members_only?: boolean
  recurring?: boolean; recur_weeks?: number
}
interface Subject { id: string; code: string; name: string; color: string; semester: string }
interface ClassSlot { day: number; startTime: string; endTime: string; room?: string }
interface Entity { id: string; slug: string; name: string; short_name: string; color: string; icon_emoji: string; is_member: boolean }

const SCHEDULE_KEY = 'dasiboard-subject-schedules'
function loadSchedules(): Record<string, ClassSlot[]> {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '{}') } catch { return {} }
}

const TYPE_COLORS: Record<string, string> = {
  exam: '#EF4444', deadline: '#F59E0B',
  academic: '#4d67f5', personal: '#10B981', work: '#EC4899', entity: '#a855f7',
}
const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline',
  academic: 'Acadêmico', personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}

function getEventLabel(ev: { event_type: string; entity_id?: string }, entities: Entity[]): { label: string; color: string } {
  if (ev.event_type === 'entity' && ev.entity_id) {
    const ent = entities.find(e => e.id === ev.entity_id)
    if (ent) return { label: ent.short_name, color: ent.color }
  }
  return {
    label: TYPE_LABELS[ev.event_type] ?? ev.event_type,
    color: TYPE_COLORS[ev.event_type] ?? '#a855f7',
  }
}

function getEventColor(ev: { event_type: string; entity_id?: string; color: string }, entities: Entity[]): string {
  if (ev.event_type === 'entity' && ev.entity_id) {
    const ent = entities.find(e => e.id === ev.entity_id)
    if (ent) return ent.color
  }
  return TYPE_COLORS[ev.event_type] ?? ev.color
}
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)
const PX_PER_HOUR = 64
const START_HOUR = 7

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}
function timeISOToMinutes(iso: string): number {
  const d = parseISO(iso)
  return d.getHours() * 60 + d.getMinutes()
}

// ── Export as .ics ────────────────────────────────────────────────────────────
function exportICS(events: Event[]) {
  const esc = (s: string) => s.replace(/[,;\\]/g, c => '\\'+c).replace(/\n/g, '\\n')
  const fmtDT = (iso: string) => iso.replace(/[-:]/g,'').replace('.000Z','Z').slice(0,15)+'Z'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DaSIboard//SI EACH USP//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const ev of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.id}@dasiboard.each.usp.br`)
    lines.push(`DTSTAMP:${fmtDT(new Date().toISOString())}`)
    lines.push(`DTSTART:${fmtDT(ev.start_at)}`)
    if (ev.end_at) lines.push(`DTEND:${fmtDT(ev.end_at)}`)
    lines.push(`SUMMARY:${esc(ev.title)}`)
    if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`)
    if (ev.location)    lines.push(`LOCATION:${esc(ev.location)}`)
    if (ev.class_code)  lines.push(`CATEGORIES:${esc(ev.class_code)}`)
    if (ev.recurring && ev.recur_weeks)
      lines.push(`RRULE:FREQ=WEEKLY;COUNT=${ev.recur_weeks}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'dasiboard-eventos.ics'; a.click()
  URL.revokeObjectURL(url)
  toast.success('Calendário exportado como .ics!')
}

// ── Event Form ────────────────────────────────────────────────────────────────
interface EventFormData {
  title: string; description: string; event_type: string
  start_at: string; end_at: string; all_day: boolean; color: string
  location: string; class_code: string; entity_id: string
  recurring: boolean; recur_weeks: number
}

function EventForm({
  isGlobal, globalKey, setGlobalKey,
  form, setForm, entities, isMemberOfEntity,
  onSubmit, onCancel, editingEvent,
}: {
  isGlobal: boolean; globalKey: string; setGlobalKey: (v: string) => void
  form: EventFormData; setForm: (f: EventFormData | ((prev: EventFormData) => EventFormData)) => void
  entities: Entity[]; isMemberOfEntity: boolean
  onSubmit: () => void; onCancel: () => void
  editingEvent?: Event | null
}) {
  const set = (k: keyof EventFormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="animate-in space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {isGlobal && <Globe size={14} className="text-pink-400"/>}
          {editingEvent ? <><Pencil size={14}/> Editar Evento</> : isGlobal ? 'Evento Global' : 'Novo Evento'}
        </h3>
        <button onClick={onCancel} style={{ color: 'var(--text-muted)' }}><X size={16}/></button>
      </div>

      {isGlobal && (
        <>
          <p className="text-xs rounded-lg px-3 py-2"
             style={{ background:'rgba(219,39,119,0.1)', border:'1px solid rgba(219,39,119,0.2)', color:'#f9a8d4' }}>
            Visível para todos. Requer chave para criar/editar.
          </p>
          <div>
            <label className="label flex items-center gap-1"><KeyRound size={11}/> Chave</label>
            <input className="input text-sm" type="password" placeholder="Chave secreta"
                   value={globalKey} onChange={e => setGlobalKey(e.target.value)}/>
          </div>
        </>
      )}

      <div>
        <label className="label">Título</label>
        <input className="input text-sm" placeholder="Nome do evento" value={form.title}
               onChange={e => set('title', e.target.value)}/>
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input text-sm" value={form.event_type}
                onChange={e => set('event_type', e.target.value)}>
          {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Entity binding */}
      {entities.filter(e => e.is_member).length > 0 && (
        <div>
          <label className="label flex items-center gap-1"><Users size={11}/> Vincular entidade <span className="normal-case text-[10px]" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
          <select className="input text-sm" value={form.entity_id}
                  onChange={e => set('entity_id', e.target.value)}>
            <option value="">Nenhuma</option>
            {entities.filter(e => e.is_member).map(e => (
              <option key={e.id} value={e.id}>{e.icon_emoji} {e.short_name || e.name}</option>
            ))}
          </select>
          {form.entity_id && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Este evento também aparecerá no painel da entidade selecionada.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label">Código da turma</label>
        <input className="input text-sm" placeholder="Ex: ACH2157" value={form.class_code}
               onChange={e => set('class_code', e.target.value)}/>
      </div>
      <div>
        <label className="label">Início</label>
        <input type="datetime-local" className="input text-sm" value={form.start_at}
               onChange={e => set('start_at', e.target.value)}/>
      </div>
      <div>
        <label className="label">Fim <span className="normal-case text-[10px]" style={{ color:'var(--text-muted)' }}>(opcional)</span></label>
        <input type="datetime-local" className="input text-sm" value={form.end_at}
               onChange={e => set('end_at', e.target.value)}/>
      </div>
      {/* ── Event time preview ───────────────────────── */}
      {form.start_at && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
             style={{ background: (form.color || 'var(--accent-1)') + '15', border: `1px solid ${form.color || 'var(--accent-1)'}33` }}>
          <div className="w-2.5 h-full min-h-[36px] rounded-full shrink-0" style={{ background: form.color || 'var(--accent-3)' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{form.title || 'Evento sem título'}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {new Date(form.start_at).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              {form.end_at && ` → ${new Date(form.end_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`}
              {form.start_at && form.end_at && (() => {
                const mins = Math.round((new Date(form.end_at).getTime() - new Date(form.start_at).getTime()) / 60000)
                if (mins > 0) return ` (${mins >= 60 ? `${Math.floor(mins/60)}h${mins%60 ? `${mins%60}min` : ''}` : `${mins}min`})`
                return ''
              })()}
            </p>
          </div>
        </div>
      )}
      <div>
        <label className="label">Local</label>
        <input className="input text-sm" placeholder="Local (opcional)" value={form.location}
               onChange={e => set('location', e.target.value)}/>
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input text-sm resize-none h-14" placeholder="Descrição…" value={form.description}
                  onChange={e => set('description', e.target.value)}/>
      </div>

      {/* Recurring */}
      <div className="flex items-center gap-3 p-3 rounded-xl"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <Repeat size={13} style={{ color: form.recurring ? 'var(--accent-3)' : 'var(--text-muted)', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.recurring}
                   onChange={e => set('recurring', e.target.checked)}
                   className="rounded" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Repetir semanalmente</span>
          </label>
          {form.recurring && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>por</span>
              <input type="number" min={1} max={52} value={form.recur_weeks}
                     onChange={e => set('recur_weeks', Number(e.target.value))}
                     className="input text-xs py-1 w-16" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>semanas</span>
            </div>
          )}
        </div>
      </div>

      <button className="btn-primary w-full justify-center" onClick={onSubmit}>
        {editingEvent ? 'Salvar alterações' : 'Criar evento'}
      </button>
    </div>
  )
}

// ── Week Schedule View ────────────────────────────────────────────────────────
function ScheduleView({ events, subjects, entities }: { events: Event[]; subjects: Subject[]; entities: Entity[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const schedules = loadSchedules()
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const TOTAL_HEIGHT = HOURS.length * PX_PER_HOUR

  const [weekEvents, setWeekEvents] = useState<Event[]>([])
  useEffect(() => {
    const from = weekStart.toISOString()
    const to   = addDays(weekStart, 7).toISOString()
    api.get('/events/', { params: { start: from, end: to } })
      .then(r => setWeekEvents(r.data))
      .catch(() => {})
  }, [weekStart])

  const classByDay = useMemo(() => {
    const map: Record<number, Array<{ sub: Subject; slot: ClassSlot }>> = {}
    subjects.forEach(sub => {
      const slots = schedules[sub.id] ?? []
      slots.forEach(slot => {
        if (!map[slot.day]) map[slot.day] = []
        map[slot.day].push({ sub, slot })
      })
    })
    return map
  }, [subjects])

  const eventsByDay = useMemo(() => {
    const map: Record<string, Event[]> = {}
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd')
      map[key] = weekEvents.filter(e => !e.all_day && isSameDay(parseISO(e.start_at), day))
    })
    return map
  }, [weekEvents, weekDays])

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      <div className="px-4 py-3 shrink-0 flex items-center justify-between gap-3"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
          {format(weekStart, "'Semana de' d 'de' MMMM", { locale: ptBR })} –{' '}
          {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekStart(s => subWeeks(s, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: 0 }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
            Hoje
          </button>
          <button onClick={() => setWeekStart(s => addWeeks(s, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" data-no-swipe>
        <div className="flex" style={{ minWidth: 500 }}>
          <div className="shrink-0 w-12" style={{ paddingTop: 44 }}>
            {HOURS.map(h => (
              <div key={h} className="flex items-start justify-end pr-2"
                   style={{ height: PX_PER_HOUR }}>
                <span className="text-[9px] font-mono -translate-y-1.5" style={{ color: 'var(--text-muted)' }}>
                  {String(h).padStart(2, '0')}h
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-1">
            {weekDays.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd')
              const isToday_d = isSameDay(day, today)
              const dayEvents = eventsByDay[key] ?? []
              const classSlots = classByDay[i] ?? []

              return (
                <div key={key} className="flex-1 flex flex-col" style={{ minWidth: 68, borderLeft: '1px solid var(--border)' }}>
                  <div className="h-11 flex flex-col items-center justify-center shrink-0 sticky top-0 z-10"
                       style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[9px] font-bold uppercase"
                          style={{ color: isToday_d ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                      {DAYS_SHORT[i]}
                    </span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                         style={{ background: isToday_d ? 'var(--accent-1)' : 'transparent', color: isToday_d ? 'white' : 'var(--text-primary)' }}>
                      <span className="text-[11px] font-bold">{format(day, 'd')}</span>
                    </div>
                  </div>

                  <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                    {HOURS.map(h => (
                      <div key={h} style={{
                        position: 'absolute', top: (h - START_HOUR) * PX_PER_HOUR,
                        left: 0, right: 0, height: PX_PER_HOUR,
                        borderTop: '1px solid var(--border)', opacity: 0.3, pointerEvents: 'none',
                      }} />
                    ))}

                    {isToday_d && (
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-soft)', opacity: 0.06, pointerEvents: 'none' }} />
                    )}

                    {/* Class slots from schedule */}
                    {classSlots.map(({ sub, slot }, ci) => {
                      const startMins = timeToMinutes(slot.startTime) - START_HOUR * 60
                      const endMins   = timeToMinutes(slot.endTime)   - START_HOUR * 60
                      const top    = (Math.max(0, startMins) / 60) * PX_PER_HOUR
                      const height = Math.max(20, ((endMins - startMins) / 60) * PX_PER_HOUR)
                      return (
                        <div key={ci}
                             className="absolute left-0.5 right-0.5 rounded overflow-hidden"
                             style={{ top, height, background: sub.color + '14', border: `1px dashed ${sub.color}44`, zIndex: 0 }}>
                          <div className="px-1 py-0.5">
                            <p className="text-[9px] font-bold leading-tight truncate" style={{ color: sub.color + 'cc' }}>
                              {sub.code}
                            </p>
                            {height > 30 && slot.room && (
                              <p className="text-[8px] leading-tight" style={{ color: sub.color + '88' }}>📍 {slot.room}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Calendar events */}
                    {dayEvents.map(e => {
                      const startMins = timeISOToMinutes(e.start_at) - START_HOUR * 60
                      const endMins   = e.end_at ? timeISOToMinutes(e.end_at) - START_HOUR * 60 : startMins + 60
                      const top    = (Math.max(0, startMins) / 60) * PX_PER_HOUR
                      const height = Math.max(22, ((endMins - startMins) / 60) * PX_PER_HOUR)
                      return (
                        <button key={e.id} onClick={() => setSelectedEvent(e)}
                                className="absolute left-0.5 right-0.5 rounded-lg text-left overflow-hidden transition-all hover:opacity-90 hover:z-20"
                                style={{ top, height, background: getEventColor(e, entities) + '25', border: `1.5px solid ${getEventColor(e, entities)}88`, borderLeft: `3px solid ${getEventColor(e, entities)}`, zIndex: 2 }}>
                          <div className="px-1 py-0.5">
                            <p className="text-[9px] font-bold leading-tight truncate" style={{ color: getEventColor(e, entities) }}>
                              {e.title}
                            </p>
                            {height > 30 && (
                              <p className="text-[8px]" style={{ color: getEventColor(e, entities), opacity: 0.7 }}>
                                {format(parseISO(e.start_at), 'HH:mm')}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {subjects.some(s => (loadSchedules()[s.id] ?? []).length > 0) && (
        <div className="px-4 py-2 shrink-0 flex gap-2 overflow-x-auto scrollbar-hide"
             style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {subjects.filter(s => (loadSchedules()[s.id] ?? []).length > 0).map(s => (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-sm border" style={{ background: s.color + '20', borderColor: s.color + '66', borderStyle: 'dashed' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.code}</span>
            </div>
          ))}
          <span className="text-[10px] italic ml-2 shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Tracejado = aula · Sólido = evento
          </span>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
         role="dialog" aria-modal="true"
             onClick={e => { if (e.target === e.currentTarget) setSelectedEvent(null) }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl animate-in"
               style={{ background: 'var(--bg-card)', border: `1px solid ${getEventColor(selectedEvent, entities)}44`, boxShadow: `0 24px 64px rgba(0,0,0,0.5)` }}>
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
            </div>
            <div className="h-1.5 rounded-t-full mx-4 mt-3 mb-4" style={{ background: getEventColor(selectedEvent, entities) }} />
            <div className="px-5 pb-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: getEventColor(selectedEvent, entities) + '20', color: getEventColor(selectedEvent, entities) }}>
                    {getEventLabel(selectedEvent, entities).label}
                  </span>
                  <h3 className="font-display font-bold text-lg mt-1.5 leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {selectedEvent.title}
                  </h3>
                </div>
                <button onClick={() => setSelectedEvent(null)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={13} style={{ flexShrink: 0 }} />
                  <span className="text-sm">
                    {smartDate(selectedEvent.start_at)}
                    {selectedEvent.end_at && ` – ${format(parseISO(selectedEvent.end_at), 'HH:mm')}`}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin size={13} style={{ flexShrink: 0 }} />
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.class_code && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <BookOpen size={13} style={{ flexShrink: 0 }} />
                    <span className="text-sm font-mono">{selectedEvent.class_code}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedEvent.description}</p>
                )}
                {selectedEvent.recurring && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Repeat size={11} />
                    <span>Recorrente · {selectedEvent.recur_weeks} semanas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Calendar Page ─────────────────────────────────────────────────────────────
const FORM_DEFAULT: EventFormData = {
  title: '', description: '', event_type: 'personal',
  start_at: '', end_at: '', all_day: false, color: '#10B981',
  location: '', class_code: '', entity_id: '',
  recurring: false, recur_weeks: 16,
}

// ── Agenda View — mobile-first list grouped by day ───────────────────────────
function AgendaView({ events, TYPE_LABELS, TYPE_COLORS, entities }: {
  events: { id: string; title: string; event_type: string; start_at: string; end_at?: string; color: string; location?: string; class_code?: string; is_global?: boolean; entity_id?: string }[]
  TYPE_LABELS: Record<string, string>
  TYPE_COLORS: Record<string, string>
  entities: Entity[]
}) {
  const today = new Date()
  const upcoming = events
    .filter(e => new Date(e.start_at) >= startOfDay(today))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 60)

  if (upcoming.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
      <CalendarDays size={40} style={{ opacity: 0.2 }} />
      <p className="text-sm">Nenhum evento próximo</p>
    </div>
  )

  // Group by day
  const groups: Record<string, typeof upcoming> = {}
  for (const ev of upcoming) {
    const dayKey = ev.start_at.slice(0, 10)
    if (!groups[dayKey]) groups[dayKey] = []
    groups[dayKey].push(ev)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {Object.entries(groups).map(([dayKey, dayEvents]) => {
        const d = new Date(dayKey + 'T12:00:00')
        const isToday2 = isSameDay(d, today)
        const isTom   = isSameDay(d, addDays(today, 1))
        const dayLabel = isToday2 ? 'Hoje' : isTom ? 'Amanhã'
          : format(d, "EEEE, d 'de' MMMM", { locale: ptBR })
        return (
          <div key={dayKey}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0"
                   style={{ background: isToday2 ? 'var(--accent-3)' : 'var(--border-light)' }} />
              <p className="text-xs font-bold uppercase tracking-widest capitalize"
                 style={{ color: isToday2 ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                {dayLabel}
              </p>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div className="space-y-2 pl-5">
              {dayEvents.map(ev => {
                const startDt = new Date(ev.start_at)
                const endDt   = ev.end_at ? new Date(ev.end_at) : null
                const color   = getEventColor(ev, entities)
                return (
                  <div key={ev.id}
                       className="flex items-start gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
                       style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
                    <div className="shrink-0 text-center" style={{ minWidth: 44 }}>
                      <p className="text-[10px] font-mono font-bold" style={{ color }}>
                        {format(startDt, 'HH:mm')}
                      </p>
                      {endDt && (
                        <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {format(endDt, 'HH:mm')}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: color + '18', color }}>
                          {getEventLabel(ev, entities).label}
                        </span>
                        {ev.location && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>📍 {ev.location}</span>
                        )}
                        {ev.class_code && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{ev.class_code}</span>
                        )}
                        {ev.is_global && (
                          <span className="text-[10px]" style={{ color: '#db2777' }}>🌐 Global</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}


export default function CalendarPage() {
  const [view, setView]         = useState<'calendar' | 'schedule' | 'agenda'>('calendar')
  const [current, setCurrent]   = useState(new Date())
  const [events, setEvents]     = useState<Event[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [selected, setSelected] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isGlobalForm, setIsGlobalForm] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [filterType, setFilterType]     = useState('all')
  const [filterClass, setFilterClass]   = useState('')
  const [globalKey, setGlobalKey]       = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormData>(FORM_DEFAULT)

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const load = useCallback(async () => {
    try {
      const [evRes, subRes, entRes] = await Promise.all([
        api.get('/events/', { params: { start: calStart.toISOString(), end: calEnd.toISOString() } }),
        api.get('/grades/subjects').catch(() => ({ data: [] })),
        api.get('/entities/').catch(() => ({ data: [] })),
      ])
      setEvents(evRes.data)
      setSubjects(subRes.data)
      setEntities(entRes.data)
    } catch { toast.error('Erro ao carregar eventos') }
  }, [current])

  useEffect(() => { load() }, [current])

  const { schedule } = useEventReminders()
  useEffect(() => { if (events.length > 0) schedule(events) }, [events, schedule])

  const filtered = events.filter((e) => {
    if (filterType !== 'all' && e.event_type !== filterType) return false
    if (filterClass && !e.class_code?.toLowerCase().includes(filterClass.toLowerCase())) return false
    return true
  })

  const eventsForDay = (day: Date) => filtered.filter((e) => isSameDay(parseISO(e.start_at), day))
  const daySelected  = selected ? eventsForDay(selected) : []

  const openForm = (global = false, ev?: Event) => {
    setIsGlobalForm(global)
    setGlobalKey('')
    if (ev) {
      setEditingEvent(ev)
      setForm({
        title: ev.title, description: ev.description ?? '', event_type: ev.event_type,
        start_at: ev.start_at.slice(0,16), end_at: ev.end_at?.slice(0,16) ?? '',
        all_day: ev.all_day, color: ev.color, location: ev.location ?? '',
        class_code: ev.class_code ?? '', entity_id: ev.entity_id ?? '',
        recurring: ev.recurring ?? false, recur_weeks: ev.recur_weeks ?? 16,
      })
    } else {
      setEditingEvent(null)
      setForm(FORM_DEFAULT)
    }
    setShowForm(true)
  }

  const createOrUpdateEvent = async () => {
    if (!form.title || !form.start_at) return
    try {
      const headers: Record<string, string> = {}
      if (isGlobalForm) {
        if (!globalKey) { toast.error('Informe a chave de acesso global'); return }
        headers['x-global-key'] = globalKey
      }
      const payload = {
        ...form,
        color: TYPE_COLORS[form.event_type] ?? form.color,
        end_at: form.end_at || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        class_code: form.class_code || undefined,
        entity_id: form.entity_id || undefined,
        is_global: isGlobalForm,
        recurring: form.recurring || undefined,
        recur_weeks: form.recurring ? form.recur_weeks : undefined,
      }

      if (editingEvent) {
        const { data } = await api.patch(`/events/${editingEvent.id}`, payload, { headers })
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? data : e))
        toast.success('Evento atualizado!')
      } else {
        const { data } = await api.post('/events/', payload, { headers })
        setEvents(prev => [...prev, data])
        toast.success(isGlobalForm ? 'Evento global criado!' : 'Evento criado!')
        addExp(isGlobalForm ? EXP_REWARDS.eventGlobal : EXP_REWARDS.eventCreated, 'event')
      }
      setShowForm(false)
      setEditingEvent(null)
      setForm(FORM_DEFAULT)
    } catch (err: any) {
      if (err.response?.status === 403) toast.error('Chave de acesso inválida')
      else toast.error(err.response?.data?.detail ?? 'Erro ao salvar evento')
    }
  }

  const deleteEvent = async (ev: Event) => {
    if (ev.is_global) { setPendingDeleteId(ev.id); setShowKeyInput(true); return }
    try {
      await api.delete(`/events/${ev.id}`)
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      toast.success('Evento removido')
    } catch { toast.error('Erro ao remover evento') }
  }

  const confirmGlobalDelete = async () => {
    if (!pendingDeleteId || !globalKey) return
    try {
      await api.delete(`/events/${pendingDeleteId}`, { headers: { 'x-global-key': globalKey } })
      setEvents(prev => prev.filter(e => e.id !== pendingDeleteId))
      setPendingDeleteId(null); setShowKeyInput(false); setGlobalKey('')
      toast.success('Evento global removido')
    } catch { toast.error('Chave de acesso inválida') }
  }

  const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  return (
    <div className="flex flex-col" style={{ height: '100dvh', minHeight: 0 }}>

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', backdropFilter: 'blur(8px)' }}>
        <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button onClick={() => setView('calendar')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: view==='calendar'?'var(--bg-card)':'transparent', color: view==='calendar'?'var(--text-primary)':'var(--text-muted)', boxShadow: view==='calendar'?'0 1px 6px rgba(0,0,0,0.12)':'none' }}>
            <CalendarDays size={13} /> Calendário
          </button>
          <button onClick={() => setView('schedule')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: view==='schedule'?'var(--bg-card)':'transparent', color: view==='schedule'?'var(--accent-3)':'var(--text-muted)', boxShadow: view==='schedule'?'0 1px 6px rgba(0,0,0,0.12)':'none' }}>
            <CalendarRange size={13} /> Cronograma
          </button>
          <button onClick={() => setView('agenda')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all sm:hidden"
                  style={{ background: view==='agenda'?'var(--bg-card)':'transparent', color: view==='agenda'?'var(--accent-3)':'var(--text-muted)', boxShadow: view==='agenda'?'0 1px 6px rgba(0,0,0,0.12)':'none' }}>
            <Clock size={13} /> Agenda
          </button>
        </div>

        {view === 'calendar' && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setShowFilters(!showFilters)}
                    className={clsx('btn-ghost p-2 transition-all', showFilters && 'text-purple-400')}
                    title="Filtros">
              <Filter size={14}/>
            </button>
            {/* .ics export */}
            <button onClick={() => exportICS(events)}
                    className="btn-ghost p-2" title="Exportar .ics">
              <Download size={14}/>
            </button>
            <button onClick={() => setCurrent(s => subMonths(s, 1))} className="btn-ghost p-1.5"><ChevronLeft size={15}/></button>
            <button onClick={() => setCurrent(new Date())}
                    className="btn-ghost text-xs px-2 py-1 font-medium" style={{ color: 'var(--accent-3)' }}>Hoje</button>
            <button onClick={() => setCurrent(s => addMonths(s, 1))} className="btn-ghost p-1.5"><ChevronRight size={15}/></button>
            <button onClick={() => openForm(false)} className="btn-primary text-xs py-1.5">
              <Plus size={13}/> <span className="hidden sm:inline">Evento</span>
            </button>
            <button onClick={() => openForm(true)} className="btn text-white text-xs py-1.5"
                    style={{ background:'linear-gradient(135deg,var(--accent-1),#db2777)', boxShadow:'0 2px 8px var(--accent-glow)' }}>
              <Globe size={13}/> <span className="hidden sm:inline">Global</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Schedule View ── */}
      {view === 'schedule' && (
        <div className="flex-1 overflow-hidden">
          <ScheduleView events={events} subjects={subjects} entities={entities} />
        </div>
      )}
      {/* ── Agenda View — mobile list ── */}
      {view === 'agenda' && (
        <AgendaView events={filtered} TYPE_LABELS={TYPE_LABELS} TYPE_COLORS={TYPE_COLORS} entities={entities} />
      )}

      {/* ── Calendar View ── */}
      {view === 'calendar' && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Calendar grid */}
          <div className="flex-1 flex flex-col p-3 md:p-4 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-xl capitalize" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {format(current, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              {filtered.length > 0 && (
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {showFilters && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-3 rounded-xl animate-in"
                   style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="label mb-0 text-[10px]">Tipo</span>
                  <select className="input text-xs py-1 w-36" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">Todos</option>
                    {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="label mb-0 text-[10px]">Turma</span>
                  <input className="input text-xs py-1 w-28" placeholder="ACH2157"
                         value={filterClass} onChange={(e) => setFilterClass(e.target.value)}/>
                </div>
                <button onClick={() => { setFilterType('all'); setFilterClass('') }} className="btn-ghost text-xs py-1">
                  <X size={11}/> Limpar
                </button>
              </div>
            )}

            <div className="grid grid-cols-7 mb-1.5">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1.5"
                     style={{ color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px rounded-xl overflow-auto flex-1"
                 style={{ minHeight: '200px', background: 'var(--border)', border: '1px solid var(--border)' }}>
              {days.map(day => {
                const dayEvs = eventsForDay(day)
                const isCurrentMonth = isSameMonth(day, current)
                const isSel = selected ? isSameDay(day, selected) : false
                return (
                  <button key={day.toISOString()}
                          onClick={() => setSelected(isSameDay(day, selected ?? new Date('')) ? null : day)}
                          className={clsx('relative flex flex-col p-1 sm:p-1.5 text-left transition-colors min-h-[52px] sm:min-h-[72px] md:min-h-[80px]', !isCurrentMonth && 'opacity-30')}
                          style={{ backgroundColor: isSel ? 'var(--accent-soft)' : 'var(--bg-base)' }}
                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-base)' }}>
                    <span className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5"
                          style={isToday(day) ? { background:'var(--gradient-btn)', color:'#fff', fontWeight:700 } : { color:'var(--text-secondary)' }}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                      {dayEvs.slice(0, 4).map(ev => (
                        <div key={ev.id} className="w-2 h-2 rounded-full transition-transform hover:scale-125" style={{ backgroundColor: getEventColor(ev, entities), boxShadow: `0 0 0 1px ${getEventColor(ev, entities)}40` }} />
                      ))}
                      {dayEvs.length > 4 && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-muted)', opacity: 0.5 }} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-full md:w-72 shrink-0 flex flex-col p-3 md:p-4 md:border-l cal-side-panel calendar-side"
               style={{ maxHeight: selected || showForm ? undefined : 'auto' }}>

            {/* Global delete modal */}
            {showKeyInput && (
              <div className="animate-in space-y-3 mb-4 p-3 rounded-xl"
                   style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-center gap-2">
                  <KeyRound size={13} style={{ color:'#f87171' }}/>
                  <h4 className="text-sm font-bold" style={{ color:'#f87171' }}>Remover global</h4>
                </div>
                <input className="input text-sm" type="password" placeholder="Chave de acesso"
                       value={globalKey} onChange={e => setGlobalKey(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') confirmGlobalDelete() }}/>
                <div className="flex gap-2">
                  <button className="btn-danger text-xs flex-1 justify-center" onClick={confirmGlobalDelete}>Confirmar</button>
                  <button className="btn-ghost text-xs" onClick={() => { setPendingDeleteId(null); setShowKeyInput(false) }}>Cancelar</button>
                </div>
              </div>
            )}

            {showForm ? (
              <EventForm
                isGlobal={isGlobalForm}
                globalKey={globalKey} setGlobalKey={setGlobalKey}
                form={form} setForm={setForm}
                entities={entities}
                isMemberOfEntity={entities.some(e => e.is_member)}
                onSubmit={createOrUpdateEvent}
                onCancel={() => { setShowForm(false); setEditingEvent(null) }}
                editingEvent={editingEvent}
              />
            ) : selected ? (
              <div className="animate-in overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold" style={{ color:'var(--text-primary)' }}>
                      {format(selected, "d 'de' MMMM", { locale:ptBR })}
                    </h3>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>{daySelected.length} evento(s)</p>
                  </div>
                  <button onClick={() => openForm(false)} className="btn-ghost p-1.5 text-xs" title="Novo evento neste dia" aria-label="Novo evento neste dia">
                    <Plus size={13}/>
                  </button>
                </div>
                {daySelected.length === 0 ? (
                  <div className="text-center py-8" style={{ color:'var(--text-muted)' }}>
                    <CalendarDays size={24} className="mx-auto mb-2 opacity-40"/>
                    <p className="text-xs">Nenhum evento neste dia</p>
                    <button onClick={() => setShowForm(true)} className="text-xs mt-2 hover:opacity-70" style={{ color:'var(--accent-3)' }}>
                      + Criar evento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {daySelected.map(ev => (
                      <div key={ev.id} className="p-3 rounded-xl border group transition-all"
                           style={{ borderColor: getEventColor(ev, entities) + '44', backgroundColor: getEventColor(ev, entities) + '0d' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {ev.is_global && <Globe size={9} className="text-pink-400 shrink-0"/>}
                              {ev.recurring && <Repeat size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                              <p className="text-sm font-medium truncate" style={{ color:'var(--text-primary)' }}>{ev.title}</p>
                            </div>
                            <p className="text-[10px]" style={{ color: getEventLabel(ev, entities).color }}>{getEventLabel(ev, entities).label}</p>
                            {ev.class_code && (
                              <span className="text-[10px] rounded px-1.5 py-0.5 mt-1 inline-block"
                                    style={{ background:'var(--border)', color:'var(--text-secondary)' }}>
                                {ev.class_code}
                              </span>
                            )}
                            <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
                              {format(parseISO(ev.start_at), 'HH:mm')}
                              {ev.end_at && ` – ${format(parseISO(ev.end_at), 'HH:mm')}`}
                            </p>
                            {ev.location && <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>📍 {ev.location}</p>}
                          </div>
                          {/* Edit + Delete buttons */}
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all mt-0.5 shrink-0">
                            <button onClick={() => openForm(ev.is_global ?? false, ev)}
                                    style={{ color: 'var(--text-muted)' }} title="Editar">
                              <Pencil size={11}/>
                            </button>
                            <button onClick={() => deleteEvent(ev)}
                                    style={{ color: ev.is_global ? '#f87171' : 'var(--text-muted)' }}
                                    title={ev.is_global ? 'Remover (requer chave)' : 'Remover'}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center" style={{ color:'var(--text-muted)' }}>
                <div>
                  <CalendarDays size={28} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">Clique em um dia para ver os eventos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
