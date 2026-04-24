// ── Eventos Hub — /eventos ────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarRange } from 'lucide-react'

const CARDS = [
  {
    to: '/eventos/calendar',
    icon: CalendarDays,
    label: 'Calendário',
    desc: 'Provas, deadlines e eventos',
    color: '#ef4444',
  },
  {
    to: '/eventos/schedule',
    icon: CalendarRange,
    label: 'Cronograma',
    desc: 'Grade de aulas e horários',
    color: '#f59e0b',
  },
]

export default function EventosPage() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          Eventos
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Cronogramas e notificações
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map(({ to, icon: Icon, label, desc, color }) => (
          <Link
            key={to}
            to={to}
            className="card flex items-center gap-4 p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ minHeight: 76 }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: color + '22', border: `1px solid ${color}44` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
