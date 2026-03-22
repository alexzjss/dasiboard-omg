// ── Turma — agrupamento por ano de entrada ─────────────────────────────────────
import Avatar from '@/components/Avatar'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users, Trophy, Calendar, ArrowLeft, ChevronRight,
  ExternalLink, Search, Star, BookOpen, Target,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

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

const TYPE_COLORS: Record<string, string> = {
  exam: '#ef4444', deadline: '#f59e0b', academic: '#4d67f5',
  personal: '#10b981', work: '#ec4899', entity: '#a855f7',
}
const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}

function MemberCard({ m, rank }: { m: TurmaMember; rank: number }) {
  const initials = m.full_name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const medals   = ['🥇', '🥈', '🥉']
  const isTop3   = rank < 3

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl transition-all hover:scale-[1.01]"
         style={{
           background: isTop3 ? `hsl(${[45,220,260][rank]},60%,${['14','12','12'][rank]}%)` : 'var(--bg-elevated)',
           border: `1px solid ${isTop3 ? ['#f59e0b','#94a3b8','#cd7f32'][rank] : 'var(--border)'}`,
         }}>
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {isTop3
          ? <span className="text-base">{medals[rank]}</span>
          : <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{rank + 1}</span>
        }
      </div>

      {/* Avatar */}
      {m.avatar_url ? (
        <Avatar name={m.full_name} url={m.avatar_url} size={10} />
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
             style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {m.full_name}
        </p>
        {m.public_bio && (
          <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.public_bio}</p>
        )}
        {m.nusp && (
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>#{m.nusp}</p>
        )}
      </div>

      {/* Badges + link */}
      <div className="flex items-center gap-2 shrink-0">
        {m.ach_count > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Trophy size={9} /> {m.ach_count}
          </span>
        )}
        {m.nusp && (
          <Link to={`/u/${m.nusp}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <ExternalLink size={11} />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function TurmaPage() {
  const { year }   = useParams<{ year?: string }>()
  const { user }   = useAuthStore()
  const [turma, setTurma]     = useState<Turma | null>(null)
  const [list,  setList]      = useState<TurmaList[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    if (year) {
      api.get(`/social/turma/${year}`)
        .then(({ data }) => setTurma(data))
        .catch(err => {
          const msg = err.response?.data?.detail ?? 'Erro ao carregar turma'
          toast.error(msg)
        })
        .finally(() => setLoading(false))
    } else {
      api.get('/social/turma')
        .then(({ data }) => setList(data))
        .catch(err => {
          const msg = err.response?.data?.detail ?? 'Erro ao carregar turmas'
          toast.error(msg)
        })
        .finally(() => setLoading(false))
    }
  }, [year])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-3 animate-in">
      {[0,1,2].map(i => (
        <div key={i} className="shimmer h-20 rounded-2xl" />
      ))}
    </div>
  )

  // ── List view ──────────────────────────────────────────────────────────────
  if (!year) {
    const currentYear = user ? undefined : undefined
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Turmas
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Colegas agrupados por ano de ingresso
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="card flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Users size={28} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Nenhum perfil público com turma ainda
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Configure seu perfil público para aparecer aqui
              </p>
            </div>
            <Link to="/settings" className="btn-primary text-sm gap-2">
              <Target size={14} /> Configurar meu perfil
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(t => (
              <Link key={t.year} to={`/turma/${t.year}`}
                    className="card-hover flex items-center gap-4 px-4 py-3.5 rounded-2xl animate-in"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                     style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
                  <span className="font-display font-bold text-lg leading-none" style={{ color: 'var(--accent-3)' }}>
                    {String(t.year).slice(2)}
                  </span>
                  <span className="text-[9px] font-semibold" style={{ color: 'var(--accent-3)', opacity: 0.7 }}>
                    {t.year}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Turma {t.year}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Users size={10} className="inline mr-1" />
                    {t.member_count} membro{t.member_count !== 1 ? 's' : ''} com perfil público
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        )}

        {/* CTA to configure profile */}
        <div className="card" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
          <div className="flex items-center gap-3">
            <Star size={18} style={{ color: 'var(--accent-3)', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Apareça na sua turma
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ative o perfil público e defina seu ano de entrada nas configurações
              </p>
            </div>
            <Link to="/settings" className="btn-primary text-xs py-1.5 px-3 shrink-0">
              Configurar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (!turma) return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      <div className="flex items-center gap-3">
        <Link to="/turma" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Turma {year}
        </h1>
      </div>
      <div className="card flex flex-col items-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Users size={28} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Turma não encontrada
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Não foi possível carregar os dados desta turma
          </p>
        </div>
        <Link to="/turma" className="btn-primary text-sm gap-2">
          <ArrowLeft size={14} /> Voltar para turmas
        </Link>
      </div>
    </div>
  )

  const ranked  = [...turma.members].sort((a, b) => b.ach_count - a.ach_count)
  const filtered = search.trim()
    ? ranked.filter(m =>
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.nusp?.includes(search) ||
        m.public_bio?.toLowerCase().includes(search.toLowerCase())
      )
    : ranked

  const totalAchs = turma.members.reduce((s, m) => s + m.ach_count, 0)
  const avgAchs   = turma.member_count > 0 ? (totalAchs / turma.member_count).toFixed(1) : '0'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/turma" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Turma {turma.year}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {turma.member_count} membro{turma.member_count !== 1 ? 's' : ''} com perfil público
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { emoji: '👥', value: turma.member_count, label: 'Membros' },
          { emoji: '🏅', value: totalAchs,           label: 'Conquistas' },
          { emoji: '📊', value: avgAchs,             label: 'Média/membro' },
        ].map(({ emoji, value, label }) => (
          <div key={label} className="card text-center py-3">
            <p className="text-lg">{emoji}</p>
            <p className="font-display font-bold text-xl leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Members list */}
        <div className="md:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }} />
            <input
              className="input pl-9 text-sm w-full"
              placeholder="Buscar por nome, NUSP ou bio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Ranking */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display font-bold text-sm flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}>
                <Trophy size={14} style={{ color: '#f59e0b' }} />
                Ranking por conquistas
                {search && (
                  <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    · {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-3 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
                  Nenhum membro encontrado
                </p>
              ) : (
                filtered.map((m, idx) => (
                  <MemberCard key={m.id} m={m} rank={ranked.indexOf(m)} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Events sidebar */}
        <div className="space-y-3">
          <div className="card">
            <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3"
                style={{ color: 'var(--text-primary)' }}>
              <Calendar size={14} style={{ color: 'var(--accent-3)' }} /> Eventos da turma
            </h2>
            {turma.events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nenhum evento da turma
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {turma.events.map(ev => (
                  <div key={ev.id} className="p-2.5 rounded-xl"
                       style={{
                         background: 'var(--bg-elevated)',
                         border: '1px solid var(--border)',
                         borderLeft: `3px solid ${TYPE_COLORS[ev.event_type] ?? ev.color}`,
                       }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ev.title}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(ev.start_at), "d MMM yyyy", { locale: ptBR })}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full inline-block mt-1"
                          style={{
                            background: (TYPE_COLORS[ev.event_type] ?? ev.color) + '18',
                            color: TYPE_COLORS[ev.event_type] ?? ev.color,
                          }}>
                      {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study rooms CTA */}
          <div className="card" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
            <BookOpen size={18} style={{ color: 'var(--accent-3)', marginBottom: 8 }} />
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Estudem juntos!
            </p>
            <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
              Crie uma sala de estudo e convide colegas da sua turma
            </p>
            <Link to="/room" className="btn-primary text-xs w-full justify-center gap-1.5">
              <Users size={12} /> Salas de estudo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
