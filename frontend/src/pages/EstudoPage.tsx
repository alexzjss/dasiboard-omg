// ── Estudo Hub — /estudo ──────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { BookOpen, KanbanSquare, GitBranch, BookMarked, Brain } from 'lucide-react'

const CARDS = [
  {
    to: '/estudo/grades',
    icon: BookOpen,
    label: 'Disciplinas',
    desc: 'Notas, frequência e materiais',
    color: '#6366f1',
  },
  {
    to: '/estudo/kanban',
    icon: KanbanSquare,
    label: 'Kanban',
    desc: 'Organização de tarefas em quadros',
    color: '#f59e0b',
  },
  {
    to: '/estudo/fluxogram',
    icon: GitBranch,
    label: 'Fluxograma',
    desc: 'Pré-requisitos e progresso no curso',
    color: '#10b981',
  },
  {
    to: '/estudo/docentes',
    icon: BookMarked,
    label: 'Docentes',
    desc: 'Professores e contatos',
    color: '#3b82f6',
  },
  {
    to: '/estudo/study',
    icon: Brain,
    label: 'Sala de Estudos',
    desc: 'Pomodoro, notas e foco',
    color: '#ec4899',
  },
]

export default function EstudoPage() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          Estudo
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Disciplinas, materiais e ferramentas acadêmicas
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
