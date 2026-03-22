// ── Perfil Público — /u/[nusp] ────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GraduationCap, Trophy, BookOpen, ArrowLeft, Share2 } from 'lucide-react'
import api from '@/utils/api'
import toast from 'react-hot-toast'
import { buildAchievements } from './ProfilePage'

interface PublicUser {
  id: string; full_name: string; nusp?: string; avatar_url?: string
  public_bio?: string; entry_year?: number; created_at: string
  subjects: { code: string; name: string; semester: string; color: string; avg_grade: number | null }[]
  achievements: string[]
}

const RARITY_COLOR: Record<string, string> = {
  common: '#6b7280', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

export default function PublicProfilePage() {
  const { nusp } = useParams<{ nusp: string }>()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    if (!nusp) return
    api.get(`/social/u/${nusp}`)
      .then(({ data }) => setUser(data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
        else toast.error('Erro ao carregar perfil')
      })
      .finally(() => setLoading(false))
  }, [nusp])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copiado!')
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-in">
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  if (notFound) return (
    <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <GraduationCap size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
      <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Perfil não encontrado
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Este Nº USP não existe ou o perfil não é público.
      </p>
      <Link to="/" className="btn-primary text-sm gap-2">
        <ArrowLeft size={14} /> Voltar ao início
      </Link>
    </div>
  )

  if (!user) return null

  const initials = user.full_name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()

  // Build unlocked achievements from the IDs the server returned
  const allAchs = buildAchievements({
    hasBoards: false, hasMultipleBoards: false, hasLanguage: false,
    hasArea: false, hasPassedSubject: false, hasFailedSubject: false,
    hasAvatar: !!user.avatar_url, hasNusp: !!user.nusp,
    eventCount: 0, subjectCount: 0, gradeCount: 0, loginCount: 1, easterEggFound: false,
  })
  const displayAchs = allAchs.filter(a => user.achievements.includes(a.id)).slice(0, 12)

  // Semester groups
  const semesterGroups: Record<string, typeof user.subjects> = {}
  for (const s of user.subjects) {
    if (!semesterGroups[s.semester]) semesterGroups[s.semester] = []
    semesterGroups[s.semester].push(s)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">

      {/* Back + share */}
      <div className="flex items-center justify-between">
        <Link to="/" className="btn-ghost text-sm gap-2 py-1.5 px-3">
          <ArrowLeft size={14} /> Início
        </Link>
        <button onClick={copyLink} className="btn-ghost text-sm gap-2 py-1.5 px-3">
          <Share2 size={14} /> Compartilhar
        </button>
      </div>

      {/* Hero card */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {/* Banner */}
        <div className="h-20 w-full" style={{
          background: `linear-gradient(135deg, hsl(${user.nusp ? parseInt(user.nusp) % 360 : 200}, 60%, 40%), hsl(${user.nusp ? (parseInt(user.nusp) + 40) % 360 : 240}, 55%, 55%))`,
        }} />
        {/* Avatar */}
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name}
                   className="w-20 h-20 rounded-2xl object-cover"
                   style={{ outline: '4px solid var(--bg-card)', outlineOffset: 0 }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold font-display"
                   style={{ background: 'var(--gradient-btn)', color: '#fff', outline: '4px solid var(--bg-card)', outlineOffset: 0 }}>
                {initials}
              </div>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {user.full_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {user.nusp && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
                Nº USP {user.nusp}
              </span>
            )}
            {user.entry_year && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                🎓 Turma {user.entry_year}
              </span>
            )}
          </div>
          {user.public_bio && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {user.public_bio}
            </p>
          )}
        </div>
      </div>

      {/* Conquistas */}
      {displayAchs.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-base flex items-center gap-2 mb-4"
              style={{ color: 'var(--text-primary)' }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} /> Conquistas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayAchs.map(a => (
              <div key={a.id}
                   className="flex items-center gap-2.5 p-2.5 rounded-xl"
                   style={{ background: a.color + '10', border: `1px solid ${a.color}30` }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{a.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-snug truncate" style={{ color: a.color }}>{a.label}</p>
                  <p className="text-[10px] capitalize" style={{ color: RARITY_COLOR[a.rarity] }}>{a.rarity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disciplinas */}
      {user.subjects.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-base flex items-center gap-2 mb-4"
              style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-3)' }} />
            Disciplinas cursadas
            <span className="ml-auto text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              {user.subjects.length} total
            </span>
          </h2>
          <div className="space-y-4">
            {Object.entries(semesterGroups).sort().map(([sem, subjects]) => (
              <div key={sem}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                   style={{ color: 'var(--text-muted)' }}>{sem}</p>
                <div className="space-y-1.5">
                  {subjects.map(s => (
                    <div key={s.code} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${s.color}` }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.code}</p>
                      </div>
                      {s.avg_grade !== null && (
                        <span className="text-xs font-bold font-mono shrink-0"
                              style={{ color: s.avg_grade >= 5 ? '#22c55e' : '#ef4444' }}>
                          {s.avg_grade.toFixed(1)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs py-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        Perfil público do DaSIboard · SI · EACH · USP
      </p>
    </div>
  )
}
