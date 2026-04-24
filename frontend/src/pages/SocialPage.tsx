// ── Social Hub — /social ──────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { Rss, Users, GraduationCap, Monitor } from 'lucide-react'

const CARDS = [
  {
    to: '/social/feed',
    icon: Rss,
    label: 'Feed',
    desc: 'Atividades recentes da comunidade',
    color: '#6366f1',
  },
  {
    to: '/social/entities',
    icon: Users,
    label: 'Entidades',
    desc: 'Grupos, atléticas e coletivos',
    color: '#a855f7',
  },
  {
    to: '/social/turma',
    icon: GraduationCap,
    label: 'Turma',
    desc: 'Sua turma e colegas de curso',
    color: '#10b981',
  },
  {
    to: '/social/room',
    icon: Monitor,
    label: 'Salas de Estudo',
    desc: 'Salas colaborativas em tempo real',
    color: '#3b82f6',
  },
]

export default function SocialPage() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          Social
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Integrações e comunidade
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
