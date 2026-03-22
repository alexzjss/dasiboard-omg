// ── Turma — agrupamento por ano de entrada ────────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, Trophy, Calendar, ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface TurmaMember {
  id: string; full_name: string; nusp?: string
  avatar_url?: string; public_bio?: string; ach_count: number
}
interface TurmaEvent {
  id: string; title: string; event_type: string
  start_at: string; color: string; location?: string
}
interface Turma {
  year: number; member_count: number
  members: TurmaMember[]; events: TurmaEvent[]
}
interface TurmaList { year: number; member_count: number }

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}

export default function TurmaPage() {
  const { year } = useParams<{ year?: string }>()
  const [turma, setTurma] = useState<Turma | null>(null)
  const [list, setList]   = useState<TurmaList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (year) {
      api.get(`/social/turma/${year}`)
        .then(({ data }) => setTurma(data))
        .catch(() => toast.error('Erro ao carregar turma'))
        .finally(() => setLoading(false))
    } else {
      api.get('/social/turma')
        .then(({ data }) => setList(data))
        .catch(() => toast.error('Erro ao carregar turmas'))
        .finally(() => setLoading(false))
    }
  }, [year])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-in">
      {[0,1,2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  )

  // ── List view ────────────────────────────────────────────────────────────────
  if (!year) return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Turmas
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Colegas que entraram no mesmo ano
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center py-16 gap-3 text-center">
          <Users size={40} style={{ opacity: 0.2, color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum perfil público com turma definida ainda
          </p>
          <Link to="/settings" className="btn-primary text-sm">Configurar meu perfil</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(t => (
            <Link key={t.year} to={`/turma/${t.year}`}
                  className="card-hover flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold font-display shrink-0"
                   style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
                {String(t.year).slice(2)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Turma {t.year}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.member_count} membro{t.member_count !== 1 ? 's' : ''} com perfil público
                </p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (!turma) return null

  const ranked = [...turma.members].sort((a, b) => b.ach_count - a.ach_count)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/turma" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Turma {turma.year}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {turma.member_count} membro{turma.member_count !== 1 ? 's' : ''} com perfil público
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Ranking */}
        <div className="md:col-span-2 card">
          <h2 className="font-display font-bold text-base flex items-center gap-2 mb-4"
              style={{ color: 'var(--text-primary)' }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} /> Membros
          </h2>
          <div className="space-y-2">
            {ranked.map((m, idx) => {
              const initials = m.full_name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:scale-[1.01]"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span className="w-8 text-center text-sm shrink-0">
                    {idx < 3 ? medals[idx] : <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>}
                  </span>
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.full_name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                         style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.full_name}</p>
                    {m.public_bio && (
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.public_bio}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {m.ach_count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        {m.ach_count} 🏅
                      </span>
                    )}
                    {m.nusp && (
                      <Link to={`/u/${m.nusp}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Events */}
        <div className="card">
          <h2 className="font-display font-bold text-base flex items-center gap-2 mb-4"
              style={{ color: 'var(--text-primary)' }}>
            <Calendar size={16} style={{ color: 'var(--accent-3)' }} /> Eventos
          </h2>
          {turma.events.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Nenhum evento da turma
            </p>
          ) : (
            <div className="space-y-2">
              {turma.events.map(ev => (
                <div key={ev.id} className="p-2.5 rounded-xl"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${ev.color}` }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {format(parseISO(ev.start_at), "d MMM yyyy", { locale: ptBR })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
