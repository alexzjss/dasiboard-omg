// ── Sala de Estudo Persistente — /room e /room/[code] ────────────────────────
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users, ArrowLeft, Copy, Plus, LogIn, LogOut,
  Timer, UserPlus, Clock, Hash, BookOpen, Send,
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
interface OnlineUser { id: string; full_name: string; nusp?: string; avatar_url?: string; joined_at: string }
interface RoomList {
  id: string; code: string; subject_name: string; creator_name: string
  online_now: number; total_sessions: number; created_at: string
}

function Initials({ name, size = 10 }: { name: string; size?: number }) {
  const ini = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size * 4, height: size * 4, fontSize: size,
                  background: 'var(--accent-soft)', color: 'var(--accent-3)',
                  border: '1px solid var(--accent-1)', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, flexShrink: 0 }}>
      {ini}
    </div>
  )
}

// ── Room List ─────────────────────────────────────────────────────────────────
function RoomList_() {
  const [rooms, setRooms] = useState<RoomList[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining]   = useState('')
  const [form, setForm] = useState({ subject_name: '', subject_code: '' })
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/social/rooms')
      .then(({ data }) => setRooms(data))
      .catch(() => toast.error('Erro ao carregar salas'))
      .finally(() => setLoading(false))
  }, [])

  const create = async () => {
    if (!form.subject_name.trim()) return
    try {
      const { data } = await api.post('/social/rooms', {
        subject_name: form.subject_name.trim(),
        subject_code: form.subject_code.trim() || undefined,
      })
      navigate(`/room/${data.code}`)
    } catch { toast.error('Erro ao criar sala') }
  }

  const joinByCode = async () => {
    const code = joining.trim().toUpperCase()
    if (!code) return
    navigate(`/room/${code}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Salas de Estudo
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Estude junto, histórico persistente, convite por Nº USP
          </p>
        </div>
      </div>

      {/* Join by code */}
      <div className="card flex gap-2">
        <input className="input flex-1 text-sm" placeholder="Código da sala (ex: BD1-24-A3B)"
               value={joining} onChange={e => setJoining(e.target.value.toUpperCase())}
               onKeyDown={e => e.key === 'Enter' && joinByCode()} />
        <button onClick={joinByCode} className="btn-primary text-sm px-4 gap-2 shrink-0">
          <LogIn size={14} /> Entrar
        </button>
      </div>

      {/* Create room */}
      {creating ? (
        <div className="card space-y-3 animate-in">
          <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Nova sala de estudo
          </h3>
          <div>
            <label className="label">Disciplina *</label>
            <input className="input text-sm" placeholder="ex: Banco de Dados I"
                   value={form.subject_name} onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Código da disciplina</label>
            <input className="input text-sm" placeholder="ex: ACH2004 (opcional)"
                   value={form.subject_code} onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-primary flex-1 justify-center text-sm">
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
        <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <Users size={40} style={{ opacity: 0.2, color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma sala ainda. Crie a primeira!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(r => (
            <Link key={r.id} to={`/room/${r.code}`}
                  className="card-hover flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
                <BookOpen size={18} style={{ color: 'var(--accent-3)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {r.subject_name}
                </p>
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {r.code} · {r.total_sessions} sessões
                </p>
              </div>
              {r.online_now > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {r.online_now} online
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Room Detail ───────────────────────────────────────────────────────────────
function RoomDetail({ code }: { code: string }) {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const [room, setRoom]         = useState<Room | null>(null)
  const [online, setOnline]     = useState<OnlineUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [inRoom, setInRoom]     = useState(false)
  const [inviteNusp, setInviteNusp] = useState('')
  const [elapsed, setElapsed]   = useState(0)
  const joinedAt = useRef<Date | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadRoom = useCallback(async () => {
    try {
      const [roomRes, onlineRes] = await Promise.all([
        api.get(`/social/rooms/${code}`),
        api.get(`/social/rooms/${code}/online`),
      ])
      setRoom(roomRes.data)
      setOnline(onlineRes.data)
      // Check if current user is online
      const uid = user?.id
      setInRoom(onlineRes.data.some((u: OnlineUser) => u.id === uid))
    } catch (err: any) {
      if (err.response?.status === 404) { toast.error('Sala não encontrada'); navigate('/room') }
      else toast.error('Erro ao carregar sala')
    } finally { setLoading(false) }
  }, [code, user?.id, navigate])

  useEffect(() => { loadRoom() }, [loadRoom])

  // Poll online users every 15s while in room
  useEffect(() => {
    if (!inRoom) return
    pollRef.current = setInterval(() => {
      api.get(`/social/rooms/${code}/online`).then(({ data }) => setOnline(data)).catch(() => {})
    }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [inRoom, code])

  // Elapsed timer
  useEffect(() => {
    if (!inRoom) return
    if (!joinedAt.current) joinedAt.current = new Date()
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - joinedAt.current!.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [inRoom])

  const join = async () => {
    try {
      await api.post(`/social/rooms/${code}/join`)
      joinedAt.current = new Date()
      setInRoom(true)
      addExp(EXP_REWARDS.pomodoroSession, 'study_room_join')
      await loadRoom()
      toast.success('Você entrou na sala!')
    } catch { toast.error('Erro ao entrar na sala') }
  }

  const leave = async () => {
    try {
      const { data } = await api.post(`/social/rooms/${code}/leave`)
      setInRoom(false)
      joinedAt.current = null
      setElapsed(0)
      await loadRoom()
      toast.success(`Sessão encerrada${data.duration_min ? ` — ${data.duration_min}min estudados!` : ''}`)
    } catch { toast.error('Erro ao sair da sala') }
  }

  const invite = async () => {
    if (!inviteNusp.trim()) return
    try {
      await api.post(`/social/rooms/${code}/invite`, { nusp: inviteNusp.trim() })
      setInviteNusp('')
      toast.success(`Convite enviado para Nº USP ${inviteNusp}`)
      await loadRoom()
    } catch { toast.error('Erro ao convidar') }
  }

  const copyCode = () => { navigator.clipboard.writeText(code); toast.success('Código copiado!') }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-in">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )
  if (!room) return null

  const sessionHistory = room.sessions.filter(s => s.left_at)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-mobile space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/room" className="btn-ghost p-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {room.subject_name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={copyCode}
                    className="flex items-center gap-1.5 text-xs font-mono transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent-3)' }}>
              <Hash size={11} /> {room.code} <Copy size={10} />
            </button>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              por {room.creator_name}
            </span>
          </div>
        </div>

        {/* Join / Leave */}
        {inRoom ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-xl"
                 style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Timer size={13} /> {mm}:{ss}
            </div>
            <button onClick={leave} className="btn-danger text-sm gap-1.5 py-2 px-3">
              <LogOut size={13} /> Sair
            </button>
          </div>
        ) : (
          <button onClick={join} className="btn-primary text-sm gap-1.5 shrink-0">
            <LogIn size={14} /> Entrar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Online now */}
        <div className="md:col-span-2 card">
          <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3"
              style={{ color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Online agora · {online.length}
          </h2>
          {online.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Ninguém online. Entre na sala!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {online.map(u => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.full_name} className="w-7 h-7 rounded-lg object-cover" />
                    : <Initials name={u.full_name} size={7} />
                  }
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name.split(' ')[0]}</p>
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
                   value={inviteNusp} onChange={e => setInviteNusp(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && invite()} />
            <button onClick={invite} className="btn-primary p-2.5 shrink-0">
              <Send size={13} />
            </button>
          </div>
          {room.invites.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Convidados
              </p>
              {room.invites.map(inv => (
                <p key={inv.invited_nusp} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {inv.full_name ?? inv.invited_nusp}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session history */}
      {sessionHistory.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3"
              style={{ color: 'var(--text-primary)' }}>
            <Clock size={14} style={{ color: 'var(--accent-3)' }} /> Histórico de sessões
          </h2>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {sessionHistory.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                   style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {s.avatar_url
                  ? <img src={s.avatar_url} alt={s.full_name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                  : <Initials name={s.full_name} size={7} />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.full_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {format(parseISO(s.joined_at), "d MMM HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {s.duration_min !== undefined && s.duration_min !== null && (
                  <span className="text-[10px] font-mono font-bold shrink-0"
                        style={{ color: 'var(--accent-3)' }}>
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
  return code ? <RoomDetail code={code.toUpperCase()} /> : <RoomList_ />
}
