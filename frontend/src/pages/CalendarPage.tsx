import { useEffect, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

interface Event {
  id: string; title: string; description?: string
  event_type: string; start_at: string; end_at?: string
  all_day: boolean; color: string; location?: string
}

const TYPE_COLORS: Record<string, string> = {
  exam:     '#EF4444',
  deadline: '#F59E0B',
  academic: '#4d67f5',
  personal: '#10B981',
}

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Entrega', academic: 'Acadêmico', personal: 'Pessoal',
}

export default function CalendarPage() {
  const [current, setCurrent]   = useState(new Date())
  const [events, setEvents]     = useState<Event[]>([])
  const [selected, setSelected] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    title: '', description: '', event_type: 'personal',
    start_at: '', end_at: '', all_day: false, color: '#10B981', location: '',
  })

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const load = async () => {
    try {
      const { data } = await api.get('/events/', {
        params: { start: calStart.toISOString(), end: calEnd.toISOString() },
      })
      setEvents(data)
    } catch { toast.error('Erro ao carregar eventos') }
  }

  useEffect(() => { load() }, [current])

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.start_at), day))

  const daySelected = selected ? eventsForDay(selected) : []

  const createEvent = async () => {
    if (!form.title || !form.start_at) return
    try {
      const payload = {
        ...form,
        color: TYPE_COLORS[form.event_type] ?? form.color,
        end_at: form.end_at || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
      }
      const { data } = await api.post('/events/', payload)
      setEvents((prev) => [...prev, data])
      setShowForm(false)
      setForm({ title: '', description: '', event_type: 'personal', start_at: '', end_at: '', all_day: false, color: '#10B981', location: '' })
      toast.success('Evento criado!')
    } catch { toast.error('Erro ao criar evento') }
  }

  const deleteEvent = async (id: string) => {
    await api.delete(`/events/${id}`)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="flex h-full">
      {/* ── Calendar grid ─────────────────────────────── */}
      <div className="flex-1 flex flex-col p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-xl font-bold text-white capitalize">
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrent(subMonths(current, 1))} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrent(new Date())} className="btn-ghost text-xs px-3">Hoje</button>
            <button onClick={() => setCurrent(addMonths(current, 1))} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary ml-2">
              <Plus size={15} /> Evento
            </button>
          </div>
        </div>

        {/* Week headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-slate-600 uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 flex-1 gap-px bg-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
          {days.map((day) => {
            const dayEvs = eventsForDay(day)
            const isCurrentMonth = isSameMonth(day, current)
            const isSelected = selected ? isSameDay(day, selected) : false
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(isSameDay(day, selected ?? new Date('')) ? null : day)}
                className={clsx(
                  'relative flex flex-col p-2 text-left transition-colors min-h-[80px]',
                  isSelected ? 'bg-brand-900/40' : 'bg-slate-950 hover:bg-slate-900',
                  !isCurrentMonth && 'opacity-30',
                )}
              >
                <span className={clsx(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isToday(day) ? 'bg-brand-600 text-white font-bold' : 'text-slate-400'
                )}>
                  {format(day, 'd')}
                </span>
                <div className="space-y-0.5 w-full overflow-hidden">
                  {dayEvs.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[10px] rounded px-1 py-0.5 truncate font-medium"
                      style={{ backgroundColor: ev.color + '33', color: ev.color }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvs.length > 3 && (
                    <div className="text-[10px] text-slate-600">+{dayEvs.length - 3}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Side panel: selected day / form ───────────── */}
      <div className="w-72 border-l border-slate-800 flex flex-col p-5">
        {showForm ? (
          <div className="animate-in space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white">Novo evento</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label">Título</label>
              <input className="input text-sm" placeholder="Nome do evento" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input text-sm" value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Início</label>
              <input type="datetime-local" className="input text-sm" value={form.start_at} onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fim <span className="normal-case text-slate-600">(opcional)</span></label>
              <input type="datetime-local" className="input text-sm" value={form.end_at} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Local</label>
              <input className="input text-sm" placeholder="Local (opcional)" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input text-sm resize-none h-16" placeholder="Descrição…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <button className="btn-primary w-full justify-center" onClick={createEvent}>Criar evento</button>
          </div>
        ) : selected ? (
          <div className="animate-in">
            <h3 className="font-display font-bold text-white mb-1">
              {format(selected, "d 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{daySelected.length} evento(s)</p>
            {daySelected.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <CalendarDays size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">Nenhum evento neste dia</p>
                <button onClick={() => setShowForm(true)} className="text-xs text-brand-400 mt-2 hover:text-brand-300">
                  + Criar evento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {daySelected.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl border group" style={{ borderColor: ev.color + '44', backgroundColor: ev.color + '11' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{ev.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: ev.color }}>{TYPE_LABELS[ev.event_type]}</p>
                        <p className="text-xs text-slate-500 mt-1">{format(parseISO(ev.start_at), 'HH:mm')}</p>
                        {ev.location && <p className="text-xs text-slate-600 mt-0.5">📍 {ev.location}</p>}
                      </div>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-700 text-xs text-center">
            <div>
              <CalendarDays size={32} className="mx-auto mb-2 opacity-20" />
              Clique em um dia para ver seus eventos
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
