import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KanbanSquare, BookOpen, CalendarDays, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

interface Stats { boards: number; subjects: number; events: number; avgGrade: number | null }

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats]   = useState<Stats>({ boards: 0, subjects: 0, events: 0, avgGrade: null })
  const [events, setEvents] = useState<any[]>([])
  const now = new Date()

  useEffect(() => {
    const load = async () => {
      try {
        const [boards, subjects, evts] = await Promise.all([
          api.get('/kanban/boards'),
          api.get('/grades/subjects'),
          api.get('/events/', { params: { start: now.toISOString() } }),
        ])

        const allGrades = subjects.data.flatMap((s: any) => s.grades)
        const avg = allGrades.length
          ? allGrades.reduce((a: number, g: any) => a + g.value, 0) / allGrades.length
          : null

        setStats({
          boards: boards.data.length,
          subjects: subjects.data.length,
          events: evts.data.length,
          avgGrade: avg,
        })
        setEvents(evts.data.slice(0, 5))
      } catch {/* ignore */}
    }
    load()
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.full_name?.split(' ')[0] ?? 'aluno'

  const cards = [
    { label: 'Quadros Kanban', value: stats.boards,   icon: KanbanSquare, color: 'text-brand-400',  bg: 'bg-brand-600/10',  to: '/kanban'   },
    { label: 'Disciplinas',    value: stats.subjects,  icon: BookOpen,     color: 'text-violet-400', bg: 'bg-violet-600/10', to: '/grades'   },
    { label: 'Próx. eventos',  value: stats.events,    icon: CalendarDays, color: 'text-emerald-400',bg: 'bg-emerald-600/10',to: '/calendar' },
    {
      label: 'Média geral',
      value: stats.avgGrade !== null ? stats.avgGrade.toFixed(1) : '—',
      icon: TrendingUp,
      color: stats.avgGrade !== null && stats.avgGrade >= 5 ? 'text-emerald-400' : 'text-red-400',
      bg: 'bg-slate-700/30',
      to: '/grades',
    },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-in">
        <p className="text-slate-500 text-sm font-medium mb-1">
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          {greeting}, {firstName} 👋
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg, to }, i) => (
          <Link
            key={label}
            to={to}
            className="card-hover group"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="font-display text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="card animate-in" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-brand-400" />
            Próximos eventos
          </h2>
          <Link to="/calendar" className="text-xs text-brand-400 hover:text-brand-300">Ver todos →</Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum evento próximo</p>
            <Link to="/calendar" className="text-xs text-brand-400 hover:text-brand-300 mt-2 inline-block">
              + Criar evento
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{ev.title}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(ev.start_at), "d MMM · HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span className={`badge text-[10px] ${
                  ev.event_type === 'exam'     ? 'bg-red-900/40 text-red-300' :
                  ev.event_type === 'deadline' ? 'bg-orange-900/40 text-orange-300' :
                  ev.event_type === 'academic' ? 'bg-brand-900/40 text-brand-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {ev.event_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {[
          { to: '/kanban',   label: 'Ir para Kanban',    icon: KanbanSquare },
          { to: '/grades',   label: 'Ver notas',          icon: BookOpen },
          { to: '/calendar', label: 'Abrir calendário',   icon: CheckCircle2 },
        ].map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className="card-hover flex items-center gap-3 text-sm text-slate-400 hover:text-slate-200"
            style={{ animationDelay: `${300 + i * 60}ms` }}
          >
            <Icon size={16} className="text-brand-500" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
