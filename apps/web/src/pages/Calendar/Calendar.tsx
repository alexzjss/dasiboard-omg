import { useState } from 'react'
import { useEvents, Event } from '../../api/hooks'
import { PageHeader, Spinner, Badge } from '../../components/ui/index'

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const TYPE_META: Record<string, { label: string; color: string; badgeColor: 'danger'|'warning'|'success'|'info'|'primary' }> = {
  prova:        { label: 'Prova',        color: 'var(--danger)',  badgeColor: 'danger'  },
  entrega:      { label: 'Entrega',      color: 'var(--warning)', badgeColor: 'warning' },
  evento:       { label: 'Evento',       color: 'var(--success)', badgeColor: 'success' },
  apresentacao: { label: 'Apresentação', color: 'var(--info)',    badgeColor: 'info'    },
  deadline:     { label: 'Deadline',     color: '#fb923c',        badgeColor: 'warning' },
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function EventCard({ ev, showDate }: { ev: Event; showDate?: boolean }) {
  const meta = TYPE_META[ev.type]
  return (
    <div style={{ display:'flex', gap:8, padding:10, background:'var(--bg2)', border:'1px solid var(--glass-border)', borderRadius:8 }}>
      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:4, background: meta?.color ?? 'var(--text-dim)' }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:2 }}>{ev.title}</div>
        {ev.description && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{ev.description}</div>}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <Badge color={meta?.badgeColor ?? 'default'}>{meta?.label ?? ev.type}</Badge>
          {showDate && <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:'auto' }}>{new Date(ev.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>}
          {ev.entidade && <span style={{ fontSize:11, color:'var(--text-dim)' }}>{ev.entidade.emoji} {ev.entidade.name}</span>}
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string>(isoDate(today))
  const [filterType, setFilterType]   = useState<string>('')

  const { data: events = [], isLoading } = useEvents({ month: month + 1, year })

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayIso = isoDate(today)

  function eventsForDay(day: number) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter((e) => e.date.slice(0,10) === iso && (!filterType || e.type === filterType))
  }

  function prevMonth() { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  const selectedEvents = events.filter((e) => e.date.slice(0,10) === selectedDay && (!filterType || e.type === filterType))
  const upcoming = events.filter((e) => e.date.slice(0,10) >= todayIso && (!filterType || e.type === filterType)).slice(0,6)

  return (
    <div>
      <PageHeader eyebrow="Agenda acadêmica" title="Calendário" description="Provas, entregas e eventos do semestre" />

      <div className="cal-layout anim-fade-up stagger-2">
        <div className="cal-main">
          {/* Nav */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <span style={{ flex:1, textAlign:'center', fontSize:17, fontWeight:700, color:'var(--text)' }}>{MONTHS[month]} {year}</span>
            <button className="cal-nav-btn" style={{ fontSize:12, padding:'5px 10px' }} onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(todayIso) }}>Hoje</button>
            <button className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>

          {/* Grid */}
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
            {isLoading
              ? <div style={{ gridColumn:'1/-1', padding:32 }}><Spinner /></div>
              : cells.map((day, i) => {
                  if (!day) return <div key={`e${i}`} />
                  const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const dayEvs = eventsForDay(day)
                  const isToday = iso === todayIso
                  const isSel   = iso === selectedDay
                  return (
                    <button
                      key={iso}
                      onClick={() => setSelectedDay(iso)}
                      className={`cal-cell ${isToday?'cal-cell--today':''} ${isSel?'cal-cell--sel':''}`}
                    >
                      <span className="cal-day-num">{day}</span>
                      <div className="cal-dots">
                        {dayEvs.slice(0,3).map((e,j) => (
                          <span key={j} className="cal-dot" style={{ background: TYPE_META[e.type]?.color ?? 'var(--text-dim)' }} />
                        ))}
                      </div>
                    </button>
                  )
                })
            }
          </div>

          {/* Legend / filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(TYPE_META).map(([k,v]) => (
              <button key={k} onClick={() => setFilterType(f => f===k?'':k)}
                className={`legend-pill ${filterType===k?'legend-pill--active':''}`}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:v.color, display:'inline-block' }} />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="cal-day-panel">
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:12, textTransform:'capitalize' }}>
              {new Date(selectedDay+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
            </div>
            {selectedEvents.length === 0
              ? <div style={{ fontSize:13, color:'var(--text-dim)' }}>Nenhum evento neste dia.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {selectedEvents.map((ev) => <EventCard key={ev.id} ev={ev} />)}
                </div>
            }
          </div>

          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.08em' }}>Próximos eventos</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {upcoming.length === 0
              ? <div style={{ fontSize:13, color:'var(--text-dim)' }}>Nenhum evento próximo.</div>
              : upcoming.map((ev) => <EventCard key={ev.id} ev={ev} showDate />)
            }
          </div>
        </div>
      </div>

      <style>{`
        .cal-layout { display:grid; grid-template-columns:1fr 300px; gap:24px; }
        .cal-main { display:flex; flex-direction:column; gap:16px; }
        .cal-nav-btn { background:var(--glass); border:1px solid var(--glass-border); border-radius:8px; padding:6px 12px; cursor:pointer; color:var(--text-muted); font-size:18px; line-height:1; transition:all .15s; }
        .cal-nav-btn:hover { color:var(--text); background:var(--glass-border); }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; padding:12px; }
        .cal-weekday { text-align:center; font-size:10px; font-weight:600; color:var(--text-dim); padding:4px 0; text-transform:uppercase; letter-spacing:.05em; }
        .cal-cell { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:4px 2px; border-radius:7px; border:1px solid transparent; cursor:pointer; background:none; color:var(--text-muted); transition:all .15s; min-height:40px; }
        .cal-cell:hover { background:var(--glass-border); color:var(--text); }
        .cal-cell--today { color:var(--primary); font-weight:700; background:rgba(124,58,237,.08); border-color:rgba(124,58,237,.2); }
        .cal-cell--sel { background:var(--primary) !important; color:white !important; border-color:var(--primary); }
        .cal-day-num { font-size:13px; line-height:1; }
        .cal-dots { display:flex; gap:2px; min-height:6px; }
        .cal-dot { width:5px; height:5px; border-radius:50%; }
        .legend-pill { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--text-muted); cursor:pointer; background:var(--glass); border:1px solid var(--glass-border); border-radius:6px; padding:4px 8px; transition:all .15s; }
        .legend-pill:hover { color:var(--text); }
        .legend-pill--active { color:var(--text); background:var(--glass-border); }
        .cal-day-panel { background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; padding:16px; }
        @media (max-width:900px) { .cal-layout { grid-template-columns:1fr; } }
      `}</style>
    </div>
  )
}
