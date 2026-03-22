// ── Sala de Estudo Persistente — /room e /room/[code] ─────────────────────────
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users, ArrowLeft, Copy, Plus, LogIn, LogOut,
  Timer, UserPlus, Clock, Hash, BookOpen, Send,
  Wifi, WifiOff, Share2, Trash2, ChevronRight,
} from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'

interface Room {
  id: string; code: string; subject_code?: string; subject_name: string
  creator_name: string; created_at: string
  sessions: Session[]; invites: Invite[]
}
interface Session {
  id: string; full_name: string; nusp?: string; avatar_url?: string
  joined_at: string; left_at?: string; duration_min?: number
}
interface Invite { invited_nusp: string; full_name?: string }
interface OnlineUser {
  id: string; full_name: string; nusp?: string; avatar_url?: string; joined_at: string
}
interface RoomListItem {
  id: string; code: string; subject_name: string; subject_code?: string
  creator_name: string; online_now: number; total_sessions: number; created_at: string
}

function Avatar({ name, url, size = 9 }: { name: string; url?: string; size?: number }) {
  const ini = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const px  = size * 4
  if (url) return <img src={url} alt={name} style={{ width: px, height: px, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{
      width: px, height: px, fontSize: size, borderRadius: 8, flexShrink: 0,
      background: 'var(--accent-soft)', color: 'var(--accent-3)',
      border: '1px solid var(--accent-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
    }}>
      {ini}
    </div>
  )
}

// ── Room List ──────────────────────────────────────────────────────────────────
function RoomListPage() {
  const [rooms,   setRooms]   = useState<RoomListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining,  setJoining]  = useState('')
  const [form, setForm] = useState({ subject_name: '', subject_code: '' })
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.get('/social/rooms')
      .then(({ data }) => setRooms(data))
      .catch(err => {
        const msg = err.response?.data?.detail ?? 'Erro ao carregar salas'
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.subject_name.trim()) { toast.error('Nome da disciplina é obrigatório'); return }
    try {
      const { data } = await api.post('/social/rooms', {
        subject_name: form.subject_name.trim(),
        subject_code: form.subject_code.trim() || undefined,
      })
      localStorage.setItem('dasiboard-room-created', '1')
      toast.success('Sala criada! 🥇')
      navigate(`/room/${data.code}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao criar sala')
    }
  }

  const joinByCode = () => {
    const code = joining.trim().toUpperCase()
    if (!code) { toast.error('Informe o código da sala'); return }
    navigate(`/room/${code}`)
  }

  const totalOnline = rooms.reduce((s, r) => s + r.online_now, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Salas de Estudo
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Histórico persistente · convite por Nº USP
          </p>
        </div>
        {totalOnline > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
               style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {totalOnline} online
          </div>
        )}
      </div>

      {/* Join by code */}
      <div className="card flex gap-2 p-3">
        <Hash size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 10 }} />
        <input className="input flex-1 text-sm" placeholder="Código da sala (ex: BD1-24-A3B)"
               value={joining}
               onChange={e => setJoining(e.target.value.toUpperCase())}
               onKeyDown={e => e.key === 'Enter' && joinByCode()} />
        <button onClick={joinByCode} className="btn-primary text-sm px-4 gap-2 shrink-0">
          <LogIn size={14} /> Entrar
        </button>
      </div>

      {/* Create room */}
      {creating ? (
        <div className="card space-y-3 animate-in">
          <h3 className="font-display font-bold text-sm flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
            <Plus size={14} style={{ color: 'var(--accent-3)' }} /> Nova sala de estudo
          </h3>
          <div>
            <label className="label">Disciplina *</label>
            <input className="input text-sm" placeholder="ex: Banco de Dados I"
                   value={form.subject_name}
                   onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))}
                   onKeyDown={e => e.key === 'Enter' && create()} />
          </div>
          <div>
            <label className="label">Código <span className="normal-case text-[10px]" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
            <input className="input text-sm" placeholder="ex: ACH2004"
                   value={form.subject_code}
                   onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-primary flex-1 justify-center text-sm gap-1.5">
              <Plus size={14} /> Criar sala
            </button>
            <button onClick={() => setCreating(false)} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-primary w-full justify-center text-sm gap-2">
          <Plus size={14} /> Criar nova sala
        </button>
      )}

      {/* Rooms list */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <BookOpen size={28} style={{ opacity: 0.25, color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Nenhuma sala ainda
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Crie uma sala ou entre com um código de convite
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(r => (
            <Link key={r.id} to={`/room/${r.code}`}
                  className="card-hover flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
                <BookOpen size={18} style={{ color: 'var(--accent-3)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {r.subject_name}
                  </p>
                  {r.subject_code && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {r.subject_code}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {r.code} · {r.total_sessions} sessões · por {r.creator_name.split(' ')[0]}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.online_now > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <Wifi size={9} /> {r.online_now}
                  </span>
                )}
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Room Detail ────────────────────────────────────────────────────────────────
function RoomDetail({ code }: { code: string }) {
  const { user }   = useAuthStore()
  const navigate   = useNavigate()
  const [room,     setRoom]     = useState<Room | null>(null)
  const [online,   setOnline]   = useState<OnlineUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [inRoom,   setInRoom]   = useState(false)
  const [inviteNusp, setInviteNusp] = useState('')
  const [elapsed,  setElapsed]  = useState(0)
  const joinedAt  = useRef<Date | null>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadRoom = useCallback(async () => {
    try {
      const [roomRes, onlineRes] = await Promise.all([
        api.get(`/social/rooms/${code}`),
        api.get(`/social/rooms/${code}/online`),
      ])
      setRoom(roomRes.data)
      setOnline(onlineRes.data)
      const uid = user?.id
      setInRoom(onlineRes.data.some((u: OnlineUser) => u.id === uid))
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Sala não encontrada')
        navigate('/room')
      } else {
        toast.error(err.response?.data?.detail ?? 'Erro ao carregar sala')
      }
    } finally { setLoading(false) }
  }, [code, user?.id, navigate])

  useEffect(() => { loadRoom() }, [loadRoom])

  // Poll online users every 15s while in room
  useEffect(() => {
    if (!inRoom) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      api.get(`/social/rooms/${code}/online`)
        .then(({ data }) => setOnline(data))
        .catch(() => {})
    }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [inRoom, code])

  // Elapsed timer
  useEffect(() => {
    if (!inRoom) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    if (!joinedAt.current) joinedAt.current = new Date()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - joinedAt.current!.getTime()) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [inRoom])

  // Leave room on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (inRoom) {
        navigator.sendBeacon(`/social/rooms/${code}/leave`, '{}')
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [inRoom, code])

  const join = async () => {
    try {
      await api.post(`/social/rooms/${code}/join`)
      joinedAt.current = new Date()
      setInRoom(true)
      addExp(EXP_REWARDS.pomodoroSession, 'study_room_join')
      await loadRoom()
      toast.success('Você entrou na sala! 📚')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao entrar na sala')
    }
  }

  const leave = async () => {
    try {
      const { data } = await api.post(`/social/rooms/${code}/leave`)
      setInRoom(false)
      joinedAt.current = null
      setElapsed(0)
      await loadRoom()
      if (data.duration_min) {
        toast.success(`Sessão encerrada — ${data.duration_min}min estudados! 🎉`)
      } else {
        toast.success('Sessão encerrada')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao sair da sala')
    }
  }

  const invite = async () => {
    const nusp = inviteNusp.trim()
    if (!nusp) { toast.error('Informe o Nº USP'); return }
    try {
      await api.post(`/social/rooms/${code}/invite`, { nusp })
      setInviteNusp('')
      toast.success(`Convite enviado para Nº USP ${nusp}`)
      await loadRoom()
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao convidar')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado!')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`)
    toast.success('Link copiado!')
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-in">
      <div className="shimmer h-32 rounded-2xl" />
      <div className="shimmer h-48 rounded-2xl" />
    </div>
  )
  if (!room) return null

  const sessionHistory = room.sessions.filter(s => s.left_at).slice(0, 20)
  const totalMinutes   = room.sessions
    .filter(s => s.duration_min)
    .reduce((sum, s) => sum + (s.duration_min ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/room" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {room.subject_name}
            </h1>
            {room.subject_code && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {room.subject_code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <button onClick={copyCode}
                    className="flex items-center gap-1 text-xs font-mono transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent-3)' }}>
              <Hash size={11} /> {room.code} <Copy size={10} />
            </button>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              criada por {room.creator_name.split(' ')[0]}
            </span>
            <button onClick={copyLink}
                    className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}>
              <Share2 size={9} /> compartilhar
            </button>
          </div>
        </div>

        {/* Join / Leave */}
        {inRoom ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-2 rounded-xl"
                 style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Timer size={13} /> {mm}:{ss}
            </div>
            <button onClick={leave} className="btn-danger text-sm gap-1.5 py-2 px-3">
              <LogOut size={13} /> Sair
            </button>
          </div>
        ) : (
          <button onClick={join} className="btn-primary text-sm gap-1.5 shrink-0">
            <LogIn size={14} /> Entrar na sala
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Wifi size={14} />, value: online.length, label: 'Online agora', color: '#22c55e' },
          { icon: <Users size={14} />, value: room.sessions.length, label: 'Sessões totais', color: 'var(--accent-3)' },
          { icon: <Clock size={14} />, value: `${totalMinutes}min`, label: 'Minutos estudados', color: '#f59e0b' },
        ].map(({ icon, value, label, color }) => (
          <div key={label} className="card text-center py-3">
            <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
            <p className="font-display font-bold text-lg leading-none" style={{ color }}>{value}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Online users */}
        <div className="md:col-span-2 card">
          <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3"
              style={{ color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Online agora
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              · {online.length} pessoa{online.length !== 1 ? 's' : ''}
            </span>
          </h2>
          {online.length === 0 ? (
            <div className="text-center py-8">
              <WifiOff size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ninguém online agora.
                {!inRoom && ' Entre na sala para estudar!'}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {online.map(u => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                     style={{
                       background: u.id === user?.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                       border: `1px solid ${u.id === user?.id ? 'var(--accent-1)' : 'var(--border)'}`,
                     }}>
                  <Avatar name={u.full_name} url={u.avatar_url} size={7} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {u.full_name.split(' ')[0]}
                      {u.id === user?.id && <span className="ml-1 text-[9px]" style={{ color: 'var(--accent-3)' }}>você</span>}
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(parseISO(u.joined_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite */}
        <div className="card space-y-3">
          <h2 className="font-display font-bold text-sm flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
            <UserPlus size={14} style={{ color: 'var(--accent-3)' }} /> Convidar
          </h2>
          <div className="flex gap-2">
            <input className="input text-sm flex-1" placeholder="Nº USP"
                   value={inviteNusp}
                   onChange={e => setInviteNusp(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && invite()} />
            <button onClick={invite} className="btn-primary p-2.5 shrink-0">
              <Send size={13} />
            </button>
          </div>

          {room.invites.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Convidados
              </p>
              {room.invites.map(inv => (
                <div key={inv.invited_nusp} className="flex items-center gap-2 p-2 rounded-lg"
                     style={{ background: 'var(--bg-elevated)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-1)' }} />
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {inv.full_name ?? `Nº USP ${inv.invited_nusp}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Share code */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Ou compartilhe o código
            </p>
            <button onClick={copyCode}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--accent-3)' }}>
                {room.code}
              </span>
              <Copy size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Session history */}
      {sessionHistory.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3"
              style={{ color: 'var(--text-primary)' }}>
            <Clock size={14} style={{ color: 'var(--accent-3)' }} />
            Histórico de sessões
            <span className="ml-auto text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              últimas {sessionHistory.length}
            </span>
          </h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {sessionHistory.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                   style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Avatar name={s.full_name} url={s.avatar_url ?? undefined} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {s.full_name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {format(parseISO(s.joined_at), "d MMM · HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {s.duration_min !== undefined && s.duration_min !== null && (
                  <span className="text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                    {s.duration_min}min
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudyRoomPersistentPage() {
  const { code } = useParams<{ code?: string }>()
  return code ? <RoomDetail code={code.toUpperCase()} /> : <RoomListPage />
}
