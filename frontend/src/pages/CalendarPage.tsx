import { useEffect, useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
  addDays, addWeeks, subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays,
  Trash2, Globe, Filter, KeyRound, CalendarRange,
  Clock, MapPin, BookOpen, Edit3, Check, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'
import { useEventReminders } from '@/hooks/usePushNotifications'
import { applyEntityOverrides } from '@/utils/entityData'

interface Event {
  id: string; title: string; description?: string
  event_type: string; start_at: string; end_at?: string
  all_day: boolean; color: string; location?: string
  class_code?: string; is_global?: boolean
  entity_id?: string | null; members_only?: boolean
}
interface Entity { id: string; slug: string; name: string; short_name: string; color: string; is_member?: boolean }
interface Subject { id: string; code: string; name: string; color: string }
interface ClassSlot { day: number; startTime: string; endTime: string; room?: string }

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
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)
const PX_PER_HOUR = 64
const START_HOUR = 7

function timeToMinutes(t: string) { const [h,m] = t.split(':').map(Number); return h*60+m }
function timeISOToMinutes(iso: string) { const d = parseISO(iso); return d.getHours()*60+d.getMinutes() }

const EMPTY_FORM = {
  title: '', description: '', event_type: 'personal',
  start_at: '', end_at: '', all_day: false, color: '#10B981',
  location: '', class_code: '', entity_ids: [] as string[],
}

// ── Event Form (create + edit, shared) ───────────────────────────────────────
function EventForm({
  initial, isGlobal, globalKey, setGlobalKey, entities, onSubmit, onCancel, isEdit,
}: {
  initial: typeof EMPTY_FORM; isGlobal: boolean
  globalKey: string; setGlobalKey: (k: string) => void
  entities: Entity[]; onSubmit: (form: typeof EMPTY_FORM) => void
  onCancel: () => void; isEdit?: boolean
}) {
  const [form, setForm] = useState(initial)
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(f => ({ ...f, ...patch }))
  const toggleEntity = (id: string) =>
    set({ entity_ids: form.entity_ids.includes(id) ? form.entity_ids.filter(e => e !== id) : [...form.entity_ids, id] })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {isGlobal && <Globe size={14} className="text-pink-400" />}
          {isEdit ? (isGlobal ? 'Editar Evento Global' : 'Editar Evento') : (isGlobal ? 'Novo Evento Global' : 'Novo Evento')}
        </h3>
        <button onClick={onCancel} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
      </div>

      {isGlobal && (
        <>
          <p className="text-xs rounded-lg px-3 py-2"
             style={{ background: 'rgba(219,39,119,0.1)', border: '1px solid rgba(219,39,119,0.2)', color: '#f9a8d4' }}>
            {isEdit ? 'Edição requer a chave global.' : 'Visível para todos. Requer chave para remover.'}
          </p>
          <div>
            <label className="label flex items-center gap-1"><KeyRound size={11} /> Chave de acesso</label>
            <input className="input text-sm" type="password" placeholder="Chave secreta"
                   value={globalKey} onChange={e => setGlobalKey(e.target.value)} />
          </div>
        </>
      )}

      <div>
        <label className="label">Título *</label>
        <input className="input text-sm" placeholder="Nome do evento" value={form.title}
               onChange={e => set({ title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Tipo</label>
          <select className="input text-sm" value={form.event_type} onChange={e => set({ event_type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Código da turma</label>
          <input className="input text-sm" placeholder="Ex: ACH2157" value={form.class_code}
                 onChange={e => set({ class_code: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Início *</label>
        <input type="datetime-local" className="input text-sm" value={form.start_at}
               onChange={e => set({ start_at: e.target.value })} />
      </div>
      <div>
        <label className="label">Fim <span className="normal-case text-[10px]" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
        <input type="datetime-local" className="input text-sm" value={form.end_at}
               onChange={e => set({ end_at: e.target.value })} />
      </div>
      <div>
        <label className="label">Local</label>
        <input className="input text-sm" placeholder="Local (opcional)" value={form.location}
               onChange={e => set({ location: e.target.value })} />
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input text-sm resize-none h-14" placeholder="Descrição…" value={form.description}
                  onChange={e => set({ description: e.target.value })} />
      </div>

      {/* Entity selector */}
      {entities.length > 0 && (
        <div>
          <label className="label flex items-center gap-1"><Users size={11} /> Atrelar entidade(s)</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {entities.map(ent => {
              const sel = form.entity_ids.includes(ent.id)
              return (
                <button key={ent.id} type="button" onClick={() => toggleEntity(ent.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: sel ? ent.color + '22' : 'var(--bg-elevated)',
                          border: `1px solid ${sel ? ent.color + '66' : 'var(--border)'}`,
                          color: sel ? ent.color : 'var(--text-muted)',
                        }}>
                  {sel && <Check size={9} />}
                  {ent.short_name}
                </button>
              )
            })}
          </div>
          <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
            O evento ficará visível na página da entidade selecionada
          </p>
        </div>
      )}

      <button className="btn-primary w-full justify-center" onClick={() => onSubmit(form)}>
        {isEdit ? 'Salvar alterações' : 'Criar evento'}
      </button>
    </div>
  )
}

// ── Schedule View ─────────────────────────────────────────────────────────────
function ScheduleView({ subjects }: { subjects: Subject[] }) {
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
    api.get('/events/', { params: { start: from, end: to } }).then(r => setWeekEvents(r.data)).catch(() => {})
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
  }, [subjects, schedules])

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
      <div className="px-4 py-2.5 shrink-0 flex items-center justify-between gap-3"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
          {format(weekStart, "'Semana de' d 'de' MMMM", { locale: ptBR })} –{' '}
          {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekStart(s => subWeeks(s, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: 0 }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
            Hoje
          </button>
          <button onClick={() => setWeekStart(s => addWeeks(s, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" data-no-swipe>
        <div className="flex" style={{ minWidth: 500 }}>
          <div className="shrink-0 w-12" style={{ paddingTop: 44 }}>
            {HOURS.map(h => (
              <div key={h} className="flex items-start justify-end pr-2" style={{ height: PX_PER_HOUR }}>
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
                    <span className="text-[9px] font-bold uppercase" style={{ color: isToday_d ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                      {DAYS_SHORT[i]}
                    </span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                         style={{ background: isToday_d ? 'var(--accent-1)' : 'transparent', color: isToday_d ? 'white' : 'var(--text-primary)' }}>
                      <span className="text-[11px] font-bold">{format(day, 'd')}</span>
                    </div>
                  </div>
                  <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ position: 'absolute', top: (h - START_HOUR) * PX_PER_HOUR, left: 0, right: 0, height: PX_PER_HOUR, borderTop: '1px solid var(--border)', opacity: 0.3, pointerEvents: 'none' }} />
                    ))}
                    {isToday_d && (
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-soft)', opacity: 0.06, pointerEvents: 'none' }} />
                    )}
                    {classSlots.map(({ sub, slot }, ci) => {
                      const top    = (Math.max(0, timeToMinutes(slot.startTime) - START_HOUR * 60) / 60) * PX_PER_HOUR
                      const height = Math.max(20, ((timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)) / 60) * PX_PER_HOUR)
                      return (
                        <div key={ci} className="absolute left-0.5 right-0.5 rounded overflow-hidden"
                             style={{ top, height, background: sub.color + '14', border: `1px dashed ${sub.color}44`, zIndex: 0 }}>
                          <div className="px-1 py-0.5">
                            <p className="text-[9px] font-bold leading-tight truncate" style={{ color: sub.color + 'cc' }}>{sub.code}</p>
                            {height > 30 && slot.room && <p className="text-[8px]" style={{ color: sub.color + '88' }}>📍 {slot.room}</p>}
                          </div>
                        </div>
                      )
                    })}
                    {dayEvents.map(e => {
                      const top    = (Math.max(0, timeISOToMinutes(e.start_at) - START_HOUR * 60) / 60) * PX_PER_HOUR
                      const height = Math.max(22, ((e.end_at ? timeISOToMinutes(e.end_at) : timeISOToMinutes(e.start_at) + 60) - timeISOToMinutes(e.start_at)) / 60 * PX_PER_HOUR)
                      return (
                        <button key={e.id} onClick={() => setSelectedEvent(e)}
                                className="absolute left-0.5 right-0.5 rounded-lg text-left overflow-hidden hover:opacity-90 hover:z-20"
                                style={{ top, height, background: e.color + '25', border: `1.5px solid ${e.color}88`, borderLeft: `3px solid ${e.color}`, zIndex: 2 }}>
                          <div className="px-1 py-0.5">
                            <p className="text-[9px] font-bold leading-tight truncate" style={{ color: e.color }}>{e.title}</p>
                            {height > 30 && <p className="text-[8px]" style={{ color: e.color, opacity: 0.7 }}>{format(parseISO(e.start_at), 'HH:mm')}</p>}
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
        <div className="px-4 py-1.5 shrink-0 flex gap-2 overflow-x-auto scrollbar-hide"
             style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {subjects.filter(s => (loadSchedules()[s.id] ?? []).length > 0).map(s => (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-sm border" style={{ background: s.color + '20', borderColor: s.color + '66', borderStyle: 'dashed' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.code}</span>
            </div>
          ))}
          <span className="text-[10px] italic ml-2 shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Tracejado = aula · Sólido = evento</span>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
             onClick={e => { if (e.target === e.currentTarget) setSelectedEvent(null) }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl animate-in"
               style={{ background: 'var(--bg-card)', border: `1px solid ${selectedEvent.color}44`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} /></div>
            <div className="h-1.5 rounded-t-full mx-4 mt-3 mb-4" style={{ background: selectedEvent.color }} />
            <div className="px-5 pb-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={13} style={{ flexShrink: 0 }} />
                <span className="text-sm">{format(parseISO(selectedEvent.start_at), "EEEE, d 'de' MMMM · HH:mm", { locale: ptBR })}</span>
              </div>
              {selectedEvent.location && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><MapPin size={13} /><span className="text-sm">{selectedEvent.location}</span></div>}
              {selectedEvent.class_code && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><BookOpen size={13} /><span className="text-sm font-mono">{selectedEvent.class_code}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Calendar Page ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view, setView]           = useState<'calendar' | 'schedule'>('calendar')
  const [current, setCurrent]     = useState(new Date())
  const [events, setEvents]       = useState<Event[]>([])
  const [subjects, setSubjects]   = useState<Subject[]>([])
  const [entities, setEntities]   = useState<Entity[]>([])
  const [selected, setSelected]   = useState<Date | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isGlobalForm, setIsGlobalForm] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [filterType, setFilterType]     = useState('all')
  const [filterClass, setFilterClass]   = useState('')
  const [globalKey, setGlobalKey]       = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const load = async () => {
    try {
      const [evRes, subRes, entRes] = await Promise.all([
        api.get('/events/', { params: { start: calStart.toISOString(), end: calEnd.toISOString() } }),
        api.get('/grades/subjects').catch(() => ({ data: [] })),
        api.get('/entities/').catch(() => ({ data: [] })),
      ])
      setEvents(evRes.data)
      setSubjects(subRes.data)
      setEntities(entRes.data.map(applyEntityOverrides))
    } catch { toast.error('Erro ao carregar eventos') }
  }

  useEffect(() => { load() }, [current])

  const { schedule } = useEventReminders()
  useEffect(() => { if (events.length > 0) schedule(events) }, [events, schedule])

  const filtered = events.filter(e => {
    if (filterType !== 'all' && e.event_type !== filterType) return false
    if (filterClass && !e.class_code?.toLowerCase().includes(filterClass.toLowerCase())) return false
    return true
  })
  const eventsForDay = (day: Date) => filtered.filter(e => isSameDay(parseISO(e.start_at), day))
  const daySelected  = selected ? eventsForDay(selected) : []
  const openNew = (global = false) => { setEditingEvent(null); setIsGlobalForm(global); setShowForm(true) }

  // ── Submit (create or edit) ──
  const submitEvent = async (form: typeof EMPTY_FORM, isEdit: boolean) => {
    if (!form.title || !form.start_at) { toast.error('Título e data são obrigatórios'); return }
    // Use first selected entity if multiple (API supports single entity_id)
    const entity_id = form.entity_ids[0] ?? null
    const payload = {
      title: form.title, description: form.description || undefined,
      event_type: form.event_type, start_at: form.start_at,
      end_at: form.end_at || undefined, all_day: form.all_day,
      color: TYPE_COLORS[form.event_type] ?? form.color,
      location: form.location || undefined,
      class_code: form.class_code || undefined,
      is_global: isGlobalForm, entity_id,
    }
    const headers: Record<string, string> = {}
    if (isGlobalForm && globalKey) headers['x-global-key'] = globalKey

    try {
      if (isEdit && editingEvent) {
        const { data } = await api.patch(`/events/${editingEvent.id}`, payload, { headers })
        setEvents(prev => prev.map(e => e.id === data.id ? data : e))
        toast.success('Evento atualizado!')
      } else {
        const { data } = await api.post('/events/', payload, { headers })
        setEvents(prev => [...prev, data])
        toast.success(isGlobalForm ? 'Evento global criado!' : 'Evento criado!')
      }
      setShowForm(false); setEditingEvent(null); setGlobalKey('')
    } catch (err: any) {
      if (err.response?.status === 403) toast.error('Chave de acesso inválida')
      else toast.error(err.response?.data?.detail ?? 'Erro ao salvar evento')
    }
  }

  const deleteEvent = async (ev: Event) => {
    if (ev.is_global) { setPendingDeleteId(ev.id); setShowKeyInput(true); return }
    await api.delete(`/events/${ev.id}`)
    setEvents(prev => prev.filter(e => e.id !== ev.id))
    toast.success('Evento removido')
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

  const startEdit = (ev: Event) => {
    if (ev.is_global) {
      // Show key prompt first for global events
      setEditingEvent(ev); setIsGlobalForm(true); setShowForm(true)
    } else {
      setEditingEvent(ev); setIsGlobalForm(false); setShowForm(true)
    }
  }

  const formInitial = editingEvent ? {
    title:       editingEvent.title,
    description: editingEvent.description ?? '',
    event_type:  editingEvent.event_type,
    start_at:    editingEvent.start_at.slice(0, 16),
    end_at:      editingEvent.end_at?.slice(0, 16) ?? '',
    all_day:     editingEvent.all_day,
    color:       editingEvent.color,
    location:    editingEvent.location ?? '',
    class_code:  editingEvent.class_code ?? '',
    entity_ids:  editingEvent.entity_id ? [editingEvent.entity_id] : [],
  } : { ...EMPTY_FORM }

  const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 52px - 60px)', minHeight: 0 }}>

      {/* View toggle */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button onClick={() => setView('calendar')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: view === 'calendar' ? 'var(--bg-card)' : 'transparent', color: view === 'calendar' ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: view === 'calendar' ? '0 1px 6px rgba(0,0,0,0.12)' : 'none' }}>
            <CalendarDays size={13} /> Calendário
          </button>
          <button onClick={() => setView('schedule')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: view === 'schedule' ? 'var(--bg-card)' : 'transparent', color: view === 'schedule' ? 'var(--accent-3)' : 'var(--text-muted)', boxShadow: view === 'schedule' ? '0 1px 6px rgba(0,0,0,0.12)' : 'none' }}>
            <CalendarRange size={13} /> Cronograma
          </button>
        </div>
        {view === 'calendar' && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-ghost p-2', showFilters && 'text-purple-400')}><Filter size={14}/></button>
            <button onClick={() => setCurrent(s => subMonths(s, 1))} className="btn-ghost p-1.5"><ChevronLeft size={15}/></button>
            <button onClick={() => setCurrent(new Date())} className="btn-ghost text-xs px-2 py-1 font-medium" style={{ color: 'var(--accent-3)' }}>Hoje</button>
            <button onClick={() => setCurrent(s => addMonths(s, 1))} className="btn-ghost p-1.5"><ChevronRight size={15}/></button>
            <button onClick={() => openNew(false)} className="btn-primary text-xs py-1.5"><Plus size={13}/> <span className="hidden sm:inline">Evento</span></button>
            <button onClick={() => openNew(true)} className="btn text-white text-xs py-1.5" style={{ background: 'linear-gradient(135deg,var(--accent-1),#db2777)', boxShadow: '0 2px 8px var(--accent-glow)' }}>
              <Globe size={13}/> <span className="hidden sm:inline">Global</span>
            </button>
          </div>
        )}
      </div>

      {/* Schedule view */}
      {view === 'schedule' && (
        <div className="flex-1 overflow-hidden">
          <ScheduleView subjects={subjects} />
        </div>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <div className="flex-1 flex flex-col p-3 md:p-4 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg capitalize" style={{ color: 'var(--text-primary)' }}>
                {format(current, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              {filtered.length > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</span>}
            </div>

            {showFilters && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-3 rounded-xl animate-in"
                   style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="label mb-0 text-[10px]">Tipo</span>
                  <select className="input text-xs py-1 w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">Todos</option>
                    {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="label mb-0 text-[10px]">Turma</span>
                  <input className="input text-xs py-1 w-28" placeholder="ACH2157" value={filterClass} onChange={e => setFilterClass(e.target.value)}/>
                </div>
                <button onClick={() => { setFilterType('all'); setFilterClass('') }} className="btn-ghost text-xs py-1"><X size={11}/> Limpar</button>
              </div>
            )}

            <div className="grid grid-cols-7 mb-1.5">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1.5" style={{ color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px rounded-xl overflow-auto flex-1"
                 style={{ minHeight: '200px', background: 'var(--border)', border: '1px solid var(--border)' }}>
              {days.map(day => {
                const dayEvs = eventsForDay(day)
                const isSel  = selected ? isSameDay(day, selected) : false
                return (
                  <button key={day.toISOString()}
                          onClick={() => setSelected(isSameDay(day, selected ?? new Date('')) ? null : day)}
                          className={clsx('relative flex flex-col p-1 sm:p-1.5 text-left transition-colors min-h-[48px] sm:min-h-[64px] md:min-h-[72px]', !isSameMonth(day, current) && 'opacity-30')}
                          style={{ backgroundColor: isSel ? 'var(--accent-soft)' : 'var(--bg-base)' }}
                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-base)' }}>
                    <span className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5"
                          style={isToday(day) ? { background: 'var(--gradient-btn)', color: '#fff', fontWeight: 700 } : { color: 'var(--text-secondary)' }}>
                      {format(day, 'd')}
                    </span>
                    <div className="hidden sm:block space-y-0.5 w-full overflow-hidden">
                      {dayEvs.slice(0, 2).map(ev => (
                        <div key={ev.id} className="text-[9px] rounded px-1 py-0.5 truncate font-medium flex items-center gap-1"
                             style={{ backgroundColor: ev.color + '22', color: ev.color }}>
                          {ev.is_global && <Globe size={7}/>}
                          {ev.title}
                        </div>
                      ))}
                      {dayEvs.length > 2 && <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{dayEvs.length-2}</div>}
                    </div>
                    <div className="sm:hidden flex gap-0.5 mt-0.5 flex-wrap">
                      {dayEvs.slice(0,3).map(ev => <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color }} />)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-full md:w-64 shrink-0 flex flex-col p-3 md:p-4 cal-side-panel calendar-side">
            {showKeyInput && (
              <div className="animate-in space-y-3 mb-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-center gap-2">
                  <KeyRound size={13} style={{ color: '#f87171' }}/>
                  <h4 className="text-sm font-bold" style={{ color: '#f87171' }}>Remover global</h4>
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
              <div className="animate-in overflow-y-auto">
                <EventForm
                  initial={formInitial}
                  isGlobal={isGlobalForm}
                  globalKey={globalKey}
                  setGlobalKey={setGlobalKey}
                  entities={entities}
                  isEdit={!!editingEvent}
                  onSubmit={form => submitEvent(form, !!editingEvent)}
                  onCancel={() => { setShowForm(false); setEditingEvent(null) }}
                />
              </div>
            ) : selected ? (
              <div className="animate-in overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                      {format(selected, "d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{daySelected.length} evento(s)</p>
                  </div>
                  <button onClick={() => openNew(false)} className="btn-ghost p-1.5" title="Novo evento">
                    <Plus size={13}/>
                  </button>
                </div>
                {daySelected.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <CalendarDays size={24} className="mx-auto mb-2 opacity-40"/>
                    <p className="text-xs">Nenhum evento neste dia</p>
                    <button onClick={() => openNew(false)} className="text-xs mt-2 hover:opacity-70" style={{ color: 'var(--accent-3)' }}>+ Criar evento</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {daySelected.map(ev => (
                      <div key={ev.id} className="p-3 rounded-xl border group"
                           style={{ borderColor: ev.color + '44', backgroundColor: ev.color + '0d' }}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {ev.is_global && <Globe size={9} className="text-pink-400 shrink-0"/>}
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                            </div>
                            <p className="text-[10px]" style={{ color: ev.color }}>{TYPE_LABELS[ev.event_type]}</p>
                            {ev.class_code && <span className="text-[10px] rounded px-1.5 py-0.5 mt-1 inline-block" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>{ev.class_code}</span>}
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(parseISO(ev.start_at), 'HH:mm')}</p>
                            {ev.location && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>📍 {ev.location}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(ev)} className="w-6 h-6 rounded-lg flex items-center justify-center"
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--accent-3)', border: '1px solid var(--border)' }} title="Editar">
                              <Edit3 size={10}/>
                            </button>
                            <button onClick={() => deleteEvent(ev)} className="w-6 h-6 rounded-lg flex items-center justify-center"
                                    style={{ background: 'var(--bg-elevated)', color: ev.is_global ? '#f87171' : 'var(--text-muted)', border: '1px solid var(--border)' }} title="Remover">
                              <Trash2 size={10}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center" style={{ color: 'var(--text-muted)' }}>
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
