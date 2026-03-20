import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { KanbanSquare, BookOpen, CalendarDays, TrendingUp, Clock, ArrowRight, Globe, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

interface Stats { boards: number; subjects: number; events: number; avgGrade: number | null }

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho',
}

export default function DashboardPage() {
  const user    = useAuthStore((s) => s.user)
  const location = useLocation()
  const [stats, setStats]     = useState<Stats>({ boards: 0, subjects: 0, events: 0, avgGrade: null })
  const [events, setEvents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const now = new Date()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
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
      setStats({ boards: boards.data.length, subjects: subjects.data.length, events: evts.data.length, avgGrade: avg })
      setEvents(evts.data.slice(0, 6))
    } catch {/* ignore */}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  // Reload every time user navigates to dashboard
  useEffect(() => { load() }, [location.pathname])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.full_name?.split(' ')[0] ?? 'aluno'

  const cards = [
    { label: 'Quadros Kanban', value: stats.boards,   icon: KanbanSquare, to: '/kanban',   key: 'boards'   },
    { label: 'Disciplinas',    value: stats.subjects,  icon: BookOpen,     to: '/grades',   key: 'subjects' },
    { label: 'Próx. eventos',  value: stats.events,    icon: CalendarDays, to: '/calendar', key: 'events'   },
    {
      label: 'Média geral',
      value: stats.avgGrade !== null ? stats.avgGrade.toFixed(1) : '—',
      icon: TrendingUp, to: '/grades', key: 'avg',
      highlight: stats.avgGrade !== null ? (stats.avgGrade >= 5 ? 'ok' : 'warn') : 'neutral',
    },
  ]

  const skeletonCard = (
    <div className="card">
      <div className="shimmer w-9 h-9 rounded-xl mb-3" />
      <div className="shimmer h-7 w-12 rounded mb-2" />
      <div className="shimmer h-3 w-20 rounded" />
    </div>
  )

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-5xl mx-auto w-full">

      {/* ── Hero header ──────────────────────────── */}
      <div className="relative mb-4 md:mb-8 overflow-hidden rounded-2xl p-4 md:p-7 animate-in"
           style={{
             background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
             border: '1px solid var(--border)',
             boxShadow: '0 4px 40px var(--accent-glow)',
           }}>
        {/* Decorative orbs */}
        <div className="accent-orb" style={{ width: 200, height: 200, top: -80, right: -80, opacity: 0.15 }} />
        <div className="accent-orb" style={{ width: 100, height: 100, bottom: -30, left: 20, opacity: 0.08, animationDelay: '3s' }} />

        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium mb-1 capitalize animate-in-delay-1"
               style={{ color: 'var(--text-muted)' }}>
              {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <h1 className="font-display text-xl md:text-3xl font-bold animate-in-delay-2"
                style={{ color: 'var(--text-primary)' }}>
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm mt-1 animate-in-delay-3" style={{ color: 'var(--text-secondary)' }}>
              Sistemas de Informação · EACH · USP
            </p>
          </div>
          <button
            onClick={() => load(true)}
            title="Atualizar"
            className={`btn-ghost p-2 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {loading
          ? [0,1,2,3].map((i) => <div key={i}>{skeletonCard}</div>)
          : cards.map(({ label, value, icon: Icon, to, key, highlight }, i) => (
            <Link
              key={key}
              to={to}
              className="card-hover group flex flex-col"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                   style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-light)' }}>
                <Icon size={18} style={{ color: 'var(--accent-3)' }} />
              </div>
              <p className="font-display text-2xl font-bold count-up"
                 style={{ color: highlight === 'warn' ? '#f87171' : 'var(--text-primary)' }}>
                {value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <div className="mt-auto pt-3 flex items-center gap-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-all"
                   style={{ color: 'var(--accent-3)' }}>
                Ver detalhes <ArrowRight size={10} />
              </div>
            </Link>
          ))
        }
      </div>

      {/* ── Main content 2-col ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Upcoming events — wide */}
        <div className="lg:col-span-3 card animate-in-delay-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
              <Clock size={16} style={{ color: 'var(--accent-3)' }} />
              Próximos eventos
            </h2>
            <Link to="/calendar" className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent-3)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="shimmer w-2 h-2 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer h-3 w-40 rounded" />
                    <div className="shimmer h-2.5 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum evento próximo</p>
              <Link to="/calendar" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent-3)' }}>
                + Criar evento
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev: any, i: number) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-default group"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5"
                       style={{ color: 'var(--text-primary)' }}>
                      {ev.is_global && <Globe size={10} style={{ color: 'var(--accent-3)' }} />}
                      {ev.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(ev.start_at), "d MMM · HH:mm", { locale: ptBR })}
                      {' · '}
                      <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                        {formatDistanceToNow(new Date(ev.start_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </p>
                  </div>
                  <span className="badge text-[10px] shrink-0"
                        style={{ background: ev.color + '22', color: ev.color, border: `1px solid ${ev.color}44` }}>
                    {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick access — narrow */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card animate-in-delay-4 flex-1">
            <h2 className="font-display font-bold text-sm mb-4 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
              Acesso rápido
            </h2>
            <div className="space-y-2">
              {[
                { to: '/kanban',   label: 'Quadros Kanban',  icon: KanbanSquare,  desc: 'Organizar tarefas'   },
                { to: '/grades',   label: 'Disciplinas',       icon: BookOpen,      desc: 'Ver disciplinas'     },
                { to: '/calendar', label: 'Calendário',       icon: CalendarDays,  desc: 'Eventos e provas'    },
              ].map(({ to, label, icon: Icon, desc }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                  style={{ border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-1)'
                    e.currentTarget.style.backgroundColor = 'var(--accent-soft)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                       style={{ background: 'var(--accent-soft)' }}>
                    <Icon size={15} style={{ color: 'var(--accent-3)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  <ArrowRight size={13} className="shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                              style={{ color: 'var(--accent-3)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Mini stat card */}
          {!loading && stats.avgGrade !== null && (
            <div className="card animate-in-delay-5 text-center"
                 style={{ background: stats.avgGrade >= 5
                   ? 'linear-gradient(135deg, rgba(34,197,94,0.08), var(--bg-card))'
                   : 'linear-gradient(135deg, rgba(239,68,68,0.08), var(--bg-card))' }}>
              <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Média geral</p>
              <p className="font-display text-4xl font-bold"
                 style={{ color: stats.avgGrade >= 5 ? '#22c55e' : '#ef4444' }}>
                {stats.avgGrade.toFixed(1)}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {stats.avgGrade >= 7 ? '🎉 Ótimo!' : stats.avgGrade >= 5 ? '✅ Aprovado' : '⚠️ Atenção'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
