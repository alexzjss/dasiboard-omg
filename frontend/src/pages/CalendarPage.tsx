import { useEffect, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays,
  Trash2, Globe, Filter, KeyRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'
import { useEventReminders, requestPushPermission } from '@/hooks/usePushNotifications'

interface Event {
  id: string; title: string; description?: string
  event_type: string; start_at: string; end_at?: string
  all_day: boolean; color: string; location?: string
  class_code?: string; is_global?: boolean
  entity_id?: string; members_only?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  exam: '#EF4444', deadline: '#F59E0B',
  academic: '#4d67f5', personal: '#10B981', work: '#EC4899', entity: '#a855f7',
}
const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline',
  academic: 'Acadêmico', personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}

export default function CalendarPage() {
  const [current, setCurrent]   = useState(new Date())
  const [events, setEvents]     = useState<Event[]>([])
  const [selected, setSelected] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isGlobalForm, setIsGlobalForm] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [filterType, setFilterType]     = useState('all')
  const [filterClass, setFilterClass]   = useState('')
  const [globalKey, setGlobalKey]       = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'personal',
    start_at: '', end_at: '', all_day: false, color: '#10B981',
    location: '', class_code: '',
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

  // Auto-schedule push notifications for future events
  const { schedule } = useEventReminders()
  useEffect(() => {
    if (events.length > 0) schedule(events)
  }, [events, schedule])

  const filtered = events.filter((e) => {
    if (filterType !== 'all' && e.event_type !== filterType) return false
    if (filterClass && !e.class_code?.toLowerCase().includes(filterClass.toLowerCase())) return false
    return true
  })

  const eventsForDay = (day: Date) =>
    filtered.filter((e) => isSameDay(parseISO(e.start_at), day))

  const daySelected = selected ? eventsForDay(selected) : []

  const openForm = (global = false) => { setIsGlobalForm(global); setShowForm(true) }

  const createEvent = async () => {
    if (!form.title || !form.start_at) return
    try {
      const headers: Record<string,string> = {}
      if (isGlobalForm) {
        if (!globalKey) { toast.error('Informe a chave de acesso global'); return }
        headers['x-global-key'] = globalKey
      }
      const { data } = await api.post('/events/', {
        ...form,
        color: TYPE_COLORS[form.event_type] ?? form.color,
        end_at: form.end_at || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        class_code: form.class_code || undefined,
        is_global: isGlobalForm,
      }, { headers })
      setEvents((prev) => [...prev, data])
      setShowForm(false)
      setForm({ title:'',description:'',event_type:'personal',start_at:'',end_at:'',all_day:false,color:'#10B981',location:'',class_code:'' })
      toast.success(isGlobalForm ? 'Evento global criado!' : 'Evento criado!')
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Erro ao criar evento'
      if (err.response?.status === 403) toast.error('Chave de acesso inválida')
      else toast.error(msg)
    }
  }

  const deleteEvent = async (ev: Event) => {
    if (ev.is_global) {
      // Need key — show input
      setPendingDeleteId(ev.id)
      setShowKeyInput(true)
      return
    }
    await api.delete(`/events/${ev.id}`)
    setEvents((prev) => prev.filter((e) => e.id !== ev.id))
  }

  const confirmGlobalDelete = async () => {
    if (!pendingDeleteId || !globalKey) return
    try {
      await api.delete(`/events/${pendingDeleteId}`, { headers: { 'x-global-key': globalKey } })
      setEvents((prev) => prev.filter((e) => e.id !== pendingDeleteId))
      toast.success('Evento global removido')
    } catch (err: any) {
      if (err.response?.status === 403) toast.error('Chave inválida')
      else toast.error('Erro ao remover')
    } finally {
      setPendingDeleteId(null)
      setShowKeyInput(false)
    }
  }

  const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  return (
    <div className="flex flex-col md:flex-row calendar-layout" style={{height:"100%",minHeight:0}}>
      {/* ── Calendar grid ─── */}
      <div className="flex-1 flex flex-col p-3 md:p-5 overflow-hidden calendar-grid-area" style={{minHeight:0}}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="animate-in">
            <h1 className="font-display text-xl font-bold capitalize" style={{ color:'var(--text-primary)' }}>
              {format(current,'MMMM yyyy',{locale:ptBR})}
            </h1>
            {filtered.length > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {filtered.length} evento{filtered.length !== 1 ? 's' : ''} neste período
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <button onClick={() => setShowFilters(!showFilters)}
                    className={clsx('btn-ghost p-2 transition-all',showFilters && 'text-purple-400')}
                    title="Filtros">
              <Filter size={15}/>
            </button>
            <button onClick={() => setCurrent(subMonths(current,1))} className="btn-ghost p-2"><ChevronLeft size={16}/></button>
            <button onClick={() => setCurrent(new Date())}
                    className="btn-ghost text-xs px-2.5 py-1.5 font-medium"
                    style={{ color: 'var(--accent-3)' }}>Hoje</button>
            <button onClick={() => setCurrent(addMonths(current,1))} className="btn-ghost p-2"><ChevronRight size={16}/></button>
            <button onClick={() => openForm(false)} className="btn-primary"><Plus size={15}/> <span className="hidden sm:inline">Evento</span></button>
            <button onClick={() => openForm(true)} className="btn text-white text-sm"
                    style={{background:'linear-gradient(135deg,var(--accent-1),#db2777)',boxShadow:'0 2px 12px var(--accent-glow)'}}>
              <Globe size={15}/> <span className="hidden sm:inline">Global</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-3 rounded-xl animate-in"
               style={{background:'var(--bg-card)',border:'1px solid var(--border)'}}>
            <div className="flex items-center gap-2">
              <span className="label mb-0">Tipo</span>
              <select className="input text-xs py-1.5 w-36" value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
                <option value="all">Todos</option>
                {Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="label mb-0">Turma</span>
              <input className="input text-xs py-1.5 w-32" placeholder="Ex: ACH2157"
                     value={filterClass} onChange={(e)=>setFilterClass(e.target.value)}/>
            </div>
            <button onClick={()=>{setFilterType('all');setFilterClass('')}} className="btn-ghost text-xs">
              <X size={12}/> Limpar
            </button>
          </div>
        )}

        {/* Week headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map((d)=>(
            <div key={d} className="text-center text-[11px] font-medium uppercase tracking-wider py-2"
                 style={{color:'var(--text-muted)'}}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-auto flex-1" style={{minHeight:"200px",background:"var(--border)",border:"1px solid var(--border)"}}>
          {days.map((day)=>{
            const dayEvs=eventsForDay(day)
            const isCurrentMonth=isSameMonth(day,current)
            const isSel=selected?isSameDay(day,selected):false
            return (
              <button key={day.toISOString()}
                onClick={()=>setSelected(isSameDay(day,selected??new Date('')) ? null : day)}
                className={clsx('relative flex flex-col p-1 sm:p-2 text-left transition-colors min-h-[52px] sm:min-h-[72px] md:min-h-[80px]',!isCurrentMonth&&'opacity-30')}
                style={{backgroundColor:isSel?'var(--accent-soft)':'var(--bg-base)'}}
                onMouseEnter={(e)=>{if(!isSel)(e.currentTarget as HTMLElement).style.backgroundColor='var(--bg-surface)'}}
                onMouseLeave={(e)=>{if(!isSel)(e.currentTarget as HTMLElement).style.backgroundColor='var(--bg-base)'}}
              >
                <span className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1"
                      style={isToday(day)?{background:'var(--gradient-btn)',color:'#fff',fontWeight:700}:{color:'var(--text-secondary)'}}>
                  {format(day,'d')}
                </span>
                {/* Mobile: colored dots. Desktop: event labels */}
                <div className="hidden sm:block space-y-0.5 w-full overflow-hidden">
                  {dayEvs.slice(0,2).map((ev)=>(
                    <div key={ev.id} className="text-[10px] rounded px-1 py-0.5 truncate font-medium flex items-center gap-1"
                         style={{backgroundColor:ev.color+'22',color:ev.color}}>
                      {ev.is_global&&<Globe size={8}/>}
                      {ev.entity_id&&!ev.is_global&&<span style={{fontSize:7,lineHeight:1}}>✦</span>}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvs.length>2&&<div className="text-[10px]" style={{color:'var(--text-muted)'}}>+{dayEvs.length-2}</div>}
                </div>
                {/* Mobile dots */}
                <div className="sm:hidden flex gap-0.5 mt-0.5 flex-wrap">
                  {dayEvs.slice(0,3).map((ev)=>(
                    <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:ev.color}} />
                  ))}
                  {dayEvs.length>3&&<div className="w-1.5 h-1.5 rounded-full opacity-40" style={{backgroundColor:'var(--text-muted)'}} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Side panel ─── */}
      <div className="w-full md:w-72 shrink-0 flex flex-col p-4 md:p-5 cal-side-panel calendar-side" style={{maxHeight: selected || showForm ? undefined : "auto"}}>
        {/* Global key delete modal */}
        {showKeyInput && (
          <div className="animate-in space-y-3 mb-4 p-4 rounded-xl"
               style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)'}}>
            <div className="flex items-center gap-2">
              <KeyRound size={14} style={{color:'#f87171'}}/>
              <h4 className="text-sm font-bold" style={{color:'#f87171'}}>Remover evento global</h4>
            </div>
            <p className="text-xs" style={{color:'var(--text-secondary)'}}>Informe a chave de acesso para confirmar.</p>
            <input className="input text-sm" type="password" placeholder="Chave de acesso"
                   value={globalKey} onChange={(e)=>setGlobalKey(e.target.value)}
                   onKeyDown={(e)=>{if(e.key==='Enter')confirmGlobalDelete()}}/>
            <div className="flex gap-2">
              <button className="btn-danger text-xs flex-1 justify-center" onClick={confirmGlobalDelete}>Confirmar</button>
              <button className="btn-ghost text-xs" onClick={()=>{setPendingDeleteId(null);setShowKeyInput(false)}}>Cancelar</button>
            </div>
          </div>
        )}

        {showForm ? (
          <div className="animate-in space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold flex items-center gap-2" style={{color:'var(--text-primary)'}}>
                {isGlobalForm&&<Globe size={14} className="text-pink-400"/>}
                {isGlobalForm?'Evento Global':'Novo Evento'}
              </h3>
              <button onClick={()=>setShowForm(false)} style={{color:'var(--text-muted)'}}><X size={16}/></button>
            </div>
            {isGlobalForm&&(
              <>
                <p className="text-xs rounded-lg px-3 py-2"
                   style={{background:'rgba(219,39,119,0.1)',border:'1px solid rgba(219,39,119,0.2)',color:'#f9a8d4'}}>
                  Visível para todos. Não pode ser removido sem a chave.
                </p>
                <div>
                  <label className="label flex items-center gap-1"><KeyRound size={11}/> Chave de acesso</label>
                  <input className="input text-sm" type="password" placeholder="Chave secreta"
                         value={globalKey} onChange={(e)=>setGlobalKey(e.target.value)}/>
                </div>
              </>
            )}
            <div>
              <label className="label">Título</label>
              <input className="input text-sm" placeholder="Nome do evento" value={form.title}
                     onChange={(e)=>setForm(f=>({...f,title:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input text-sm" value={form.event_type}
                      onChange={(e)=>setForm(f=>({...f,event_type:e.target.value}))}>
                {Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Código da turma</label>
              <input className="input text-sm" placeholder="Ex: ACH2157" value={form.class_code}
                     onChange={(e)=>setForm(f=>({...f,class_code:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Início</label>
              <input type="datetime-local" className="input text-sm" value={form.start_at}
                     onChange={(e)=>setForm(f=>({...f,start_at:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Fim <span className="normal-case" style={{color:'var(--text-muted)'}}>(opcional)</span></label>
              <input type="datetime-local" className="input text-sm" value={form.end_at}
                     onChange={(e)=>setForm(f=>({...f,end_at:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Local</label>
              <input className="input text-sm" placeholder="Local (opcional)" value={form.location}
                     onChange={(e)=>setForm(f=>({...f,location:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input text-sm resize-none h-16" placeholder="Descrição…" value={form.description}
                        onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/>
            </div>
            <button className="btn-primary w-full justify-center" onClick={createEvent}>Criar evento</button>
          </div>
        ) : selected ? (
          <div className="animate-in">
            <h3 className="font-display font-bold mb-1" style={{color:'var(--text-primary)'}}>
              {format(selected,"d 'de' MMMM",{locale:ptBR})}
            </h3>
            <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>{daySelected.length} evento(s)</p>
            {daySelected.length===0 ? (
              <div className="text-center py-8" style={{color:'var(--text-muted)'}}>
                <CalendarDays size={28} className="mx-auto mb-2 opacity-40"/>
                <p className="text-xs">Nenhum evento neste dia</p>
                <button onClick={()=>setShowForm(true)} className="text-xs mt-2 hover:opacity-70" style={{color:'var(--accent-3)'}}>
                  + Criar evento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {daySelected.map((ev)=>(
                  <div key={ev.id} className="p-3 rounded-xl border group transition-all"
                       style={{borderColor:ev.color+'44',backgroundColor:ev.color+'11'}}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {ev.is_global&&<Globe size={10} className="text-pink-400 shrink-0"/>}
                          <p className="text-sm font-medium" style={{color:'var(--text-primary)'}}>{ev.title}</p>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{color:ev.color}}>{TYPE_LABELS[ev.event_type]}</p>
                        {ev.class_code&&(
                          <span className="text-[10px] rounded px-1.5 py-0.5 mt-1 inline-block"
                                style={{background:'var(--border)',color:'var(--text-secondary)'}}>
                            {ev.class_code}
                          </span>
                        )}
                        <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>{format(parseISO(ev.start_at),'HH:mm')}</p>
                        {ev.location&&<p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>📍 {ev.location}</p>}
                      </div>
                      <button onClick={()=>deleteEvent(ev)}
                              className="opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                              style={{color:ev.is_global?'#f87171':'var(--text-muted)'}}
                              title={ev.is_global?'Remover (requer chave)':'Remover'}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center" style={{color:'var(--text-muted)'}}>
            <div>
              <CalendarDays size={32} className="mx-auto mb-2 opacity-20"/>
              <p className="text-xs">Clique em um dia para ver seus eventos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
