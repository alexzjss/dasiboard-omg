// ── Feed de Atividade — /feed ─────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Users, Globe, Rss,
  BookOpen, Trophy, LogIn, Share2, UserPlus,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

interface FeedItem {
  id: string
  kind: string
  payload: Record<string, any>
  created_at: string
  actor_id: string
  actor_name: string
  actor_nusp?: string
  actor_avatar?: string
  actor_public?: boolean
}

const KIND_META: Record<string, { icon: React.ReactNode; color: string; label: (p: any, name: string) => string }> = {
  note_shared:   { icon: <Share2 size={14} />,    color: '#22c55e',  label: (p, n) => `${n} compartilhou uma nota: "${p.title ?? ''}"` },
  room_joined:   { icon: <LogIn size={14} />,     color: '#4d67f5',  label: (p, n) => `${n} entrou na sala ${p.subject_name ?? p.room_code ?? ''}` },
  room_created:  { icon: <BookOpen size={14} />,  color: '#a855f7',  label: (p, n) => `${n} criou a sala "${p.subject_name ?? ''}"` },
  badge_unlocked:{ icon: <Trophy size={14} />,    color: '#f59e0b',  label: (p, n) => `${n} desbloqueou a conquista ${p.emoji ?? '🏅'} ${p.label ?? ''}` },
  followed:      { icon: <UserPlus size={14} />,  color: '#ec4899',  label: (p, n) => `${n} começou a seguir ${p.target_name ?? p.target_nusp ?? 'alguém'}` },
  event_mention: { icon: <Globe size={14} />,     color: '#f97316',  label: (p, n) => `${n} marcou membros no evento "${p.event_title ?? ''}"` },
}

function FeedCard({ item }: { item: FeedItem }) {
  const meta  = KIND_META[item.kind]
  const ini   = item.actor_name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()

  if (!meta) return null

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl animate-in"
         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      {/* Actor avatar */}
      <Link to={item.actor_nusp && item.actor_public ? `/u/${item.actor_nusp}` : '#'}
            className="shrink-0">
        {item.actor_avatar ? (
          <img src={item.actor_avatar} alt={item.actor_name}
               className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
               style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
            {ini}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        {/* Action text */}
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          {meta.label(item.payload, item.actor_name)}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
               style={{ background: meta.color + '18', color: meta.color }}>
            {meta.icon}
            <span className="capitalize">{item.kind.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        {/* Payload preview */}
        {item.kind === 'note_shared' && item.payload.preview && (
          <p className="text-xs mt-2 line-clamp-2 italic"
             style={{ color: 'var(--text-muted)', borderLeft: `2px solid ${meta.color}`, paddingLeft: 8 }}>
            {item.payload.preview}
          </p>
        )}
        {item.kind === 'badge_unlocked' && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl inline-flex"
               style={{ background: meta.color + '12', border: `1px solid ${meta.color}30` }}>
            <span style={{ fontSize: 18 }}>{item.payload.emoji ?? '🏅'}</span>
            <div>
              <p className="text-xs font-bold" style={{ color: meta.color }}>{item.payload.label}</p>
              {item.payload.rarity && (
                <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{item.payload.rarity}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user }   = useAuthStore()
  const [items,    setItems]    = useState<FeedItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [mode,     setMode]     = useState<'following' | 'all'>('following')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const { data } = await api.get(`/social/feed?mode=${mode}&limit=50`)
      setItems(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao carregar feed')
    } finally { setLoading(false); setRefreshing(false) }
  }, [mode])

  useEffect(() => { setLoading(true); load() }, [mode, load])

  // Group by day
  const groups: Record<string, FeedItem[]> = {}
  for (const item of items) {
    const day = item.created_at.slice(0, 10)
    ;(groups[day] ??= []).push(item)
  }

  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const dayLabel  = (key: string) =>
    key === today ? 'Hoje' : key === yesterday ? 'Ontem'
    : new Date(key + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Feed de Atividade
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Atividades recentes da rede
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
                className={`btn-ghost p-2 ${refreshing ? 'animate-spin' : ''}`}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {([
          ['following', <Users size={13} />, 'Seguindo'],
          ['all',       <Globe size={13} />, 'Descobrir'],
        ] as const).map(([m, icon, label]) => (
          <button key={m} onClick={() => setMode(m as any)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: mode === m ? 'var(--bg-card)' : 'transparent',
                    color: mode === m ? 'var(--accent-3)' : 'var(--text-muted)',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Rss size={28} style={{ opacity: 0.25, color: 'var(--text-muted)' }} />
          </div>
          {mode === 'following' ? (
            <>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhuma atividade</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Siga colegas nos perfis públicos para ver a atividade deles aqui
                </p>
              </div>
              <button onClick={() => setMode('all')} className="btn-primary text-sm gap-2">
                <Globe size={14} /> Descobrir pessoas
              </button>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Nenhuma atividade pública ainda
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Ative o perfil público e compartilhe notas para aparecer aqui
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([day, dayItems]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest capitalize"
                   style={{ color: 'var(--text-muted)' }}>
                  {dayLabel(day)}
                </p>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="space-y-2">
                {dayItems.map(item => <FeedCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA if profile not public */}
      {!loading && !user?.nusp && (
        <div className="card" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Apareça no feed de colegas
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Configure um perfil público para que suas atividades apareçam para quem te segue
          </p>
          <Link to="/settings" className="btn-primary text-xs gap-1.5">
            Configurar perfil →
          </Link>
        </div>
      )}
    </div>
  )
}
