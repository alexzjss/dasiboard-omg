import { useEffect, useState } from 'react'
import {
  Users, Globe, Instagram, Mail, Lock, Unlock, Plus, X, Calendar,
  ChevronRight, ExternalLink, KeyRound, Eye, EyeOff, ArrowLeft,
  Shield, Clock, MapPin,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '@/utils/api'

interface Entity {
  id: string; slug: string; name: string; short_name: string; description: string
  category: string; color: string; icon_emoji: string
  website_url?: string; instagram_url?: string; email?: string
  member_count: number; is_member: boolean
}

interface EntityEvent {
  id: string; title: string; description?: string; event_type: string
  start_at: string; end_at?: string; all_day: boolean; color: string
  location?: string; members_only: boolean; entity_id: string
}

const CATEGORY_LABELS: Record<string, string> = {
  academic: 'Acadêmico', tech: 'Tecnologia', research: 'Pesquisa',
  empresa: 'Empresa', event: 'Evento', diversity: 'Diversidade',
}

const TYPE_LABELS: Record<string, string> = {
  academic: 'Acadêmico', personal: 'Pessoal', deadline: 'Deadline',
  exam: 'Prova', entity: 'Entidade',
}

// ── Event creation modal ─────────────────────────────────
function EventModal({ entity, onClose, onCreated }: {
  entity: Entity; onClose: () => void; onCreated: (ev: EntityEvent) => void
}) {
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'entity', start_at: '', end_at: '',
    all_day: false, color: entity.color, location: '', members_only: false,
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.title || !form.start_at) { toast.error('Título e data são obrigatórios'); return }
    setSaving(true)
    try {
      const { data } = await api.post(`/entities/${entity.slug}/events`, {
        ...form, end_at: form.end_at || undefined, description: form.description || undefined,
        location: form.location || undefined,
      })
      onCreated(data)
      onClose()
      toast.success('Evento criado!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao criar evento')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-in space-y-4" style={{maxHeight:"90dvh",overflowY:"auto",background:"var(--bg-card)",border:`1px solid ${entity.color}33`,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            {entity.icon_emoji} Novo evento — {entity.short_name}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div>
          <label className="label">Título</label>
          <input className="input text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea className="input resize-none h-16 text-sm" value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Início</label>
            <input type="datetime-local" className="input text-sm" value={form.start_at}
                   onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))} />
          </div>
          <div>
            <label className="label">Fim <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
            <input type="datetime-local" className="input text-sm" value={form.end_at}
                   onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Local</label>
          <input className="input text-sm" placeholder="Local (opcional)" value={form.location}
                 onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <div className="w-9 h-5 rounded-full transition-all relative"
               style={{ background: form.members_only ? entity.color : 'var(--border)' }}
               onClick={() => setForm((f) => ({ ...f, members_only: !f.members_only }))}>
            <div className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow"
                 style={{ left: form.members_only ? '18px' : '2px' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Apenas membros</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visível só para membros da entidade</p>
          </div>
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={submit} disabled={saving}
                  style={{ background: `linear-gradient(135deg, ${entity.color}, ${entity.color}cc)` }}>
            {saving ? 'Criando…' : 'Criar evento'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Join modal ───────────────────────────────────────────
function JoinModal({ entity, onClose, onJoined }: {
  entity: Entity; onClose: () => void; onJoined: () => void
}) {
  const [key, setKey]   = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const join = async () => {
    if (!key.trim()) return
    setLoading(true)
    try {
      await api.post(`/entities/${entity.slug}/join`, { key })
      toast.success(`Bem-vindo(a) ao ${entity.short_name}! 🎉`)
      onJoined()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Chave inválida')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-in space-y-4" style={{maxHeight:"90dvh",overflowY:"auto",background:"var(--bg-card)",border:`1px solid ${entity.color}33`,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
               style={{ background: entity.color + '22', border: `1px solid ${entity.color}44` }}>
            {entity.icon_emoji}
          </div>
          <div>
            <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Entrar na entidade</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{entity.short_name}</p>
          </div>
          <button onClick={onClose} className="ml-auto" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Insira a chave de acesso fornecida pela entidade para se tornar membro.
        </p>
        <div>
          <label className="label"><KeyRound size={11} className="inline mr-1" />Chave de acesso</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="••••••••••••"
                   value={key} onChange={(e) => setKey(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') join() }} />
            <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button className="btn-primary w-full justify-center" onClick={join} disabled={loading || !key.trim()}
                style={{ background: `linear-gradient(135deg, ${entity.color}, ${entity.color}cc)` }}>
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ── Entity detail view ───────────────────────────────────
function EntityDetail({ entity: initial, onBack, onMembershipChange }: {
  entity: Entity; onBack: () => void; onMembershipChange: (slug: string, is_member: boolean) => void
}) {
  const [entity, setEntity] = useState(initial)
  const [events, setEvents] = useState<EntityEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [showJoin, setShowJoin]   = useState(false)
  const [showEvent, setShowEvent] = useState(false)

  useEffect(() => {
    api.get(`/entities/${entity.slug}/events`)
      .then(({ data }) => setEvents(data))
      .catch(() => toast.error('Erro ao carregar eventos'))
      .finally(() => setLoadingEvents(false))
  }, [entity.slug, entity.is_member])

  const leave = async () => {
    await api.post(`/entities/${entity.slug}/leave`)
    const updated = { ...entity, is_member: false }
    setEntity(updated)
    onMembershipChange(entity.slug, false)
    toast.success('Você saiu da entidade')
    setEvents(events.filter((e) => !e.members_only))
  }

  const handleJoined = () => {
    const updated = { ...entity, is_member: true, member_count: entity.member_count + 1 }
    setEntity(updated)
    onMembershipChange(entity.slug, true)
    // Reload events to get members_only
    api.get(`/entities/${entity.slug}/events`).then(({ data }) => setEvents(data))
  }

  const upcomingEvents = events.filter((e) => new Date(e.start_at) >= new Date()).slice(0, 5)
  const pastEvents = events.filter((e) => new Date(e.start_at) < new Date()).slice(0, 3)

  return (
    <div className="flex-1 overflow-auto">
      {showJoin && <JoinModal entity={entity} onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
      {showEvent && <EventModal entity={entity} onClose={() => setShowEvent(false)} onCreated={(ev) => setEvents((p) => [...p, ev])} />}

      {/* Hero */}
      <div className="relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${entity.color}22 0%, var(--bg-surface) 60%)`, borderBottom: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: `radial-gradient(ellipse at 80% 50%, ${entity.color}18 0%, transparent 60%)` }} />
        <div className="relative z-10 p-4 md:p-8">
          <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4 transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                 style={{ background: entity.color + '22', border: `1px solid ${entity.color}44` }}>
              {entity.icon_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: entity.color + '22', color: entity.color }}>
                  {CATEGORY_LABELS[entity.category] ?? entity.category}
                </span>
                {entity.is_member && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <Shield size={9} /> Membro
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{entity.name}</h1>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Users size={11} /> {entity.member_count} membros</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap sm:shrink-0">
              {entity.is_member ? (
                <>
                  <button onClick={() => setShowEvent(true)} className="btn-primary text-sm"
                          style={{ background: `linear-gradient(135deg, ${entity.color}, ${entity.color}cc)` }}>
                    <Plus size={14} /> Criar evento
                  </button>
                  <button onClick={leave} className="btn-danger text-sm">Sair</button>
                </>
              ) : (
                <button onClick={() => setShowJoin(true)} className="btn-primary text-sm"
                        style={{ background: `linear-gradient(135deg, ${entity.color}, ${entity.color}cc)` }}>
                  <Lock size={14} /> Entrar
                </button>
              )}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {entity.description}
          </p>
          {/* Links */}
          <div className="flex items-center gap-3 mt-4">
            {entity.instagram_url && (
              <a href={entity.instagram_url} target="_blank" rel="noreferrer"
                 className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = entity.color; (e.currentTarget as HTMLElement).style.color = entity.color }}
                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
                <Instagram size={12} /> Instagram
              </a>
            )}
            {entity.website_url && (
              <a href={entity.website_url} target="_blank" rel="noreferrer"
                 className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = entity.color; (e.currentTarget as HTMLElement).style.color = entity.color }}
                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
                <Globe size={12} /> Website
              </a>
            )}
            {entity.email && (
              <a href={`mailto:${entity.email}`}
                 className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = entity.color; (e.currentTarget as HTMLElement).style.color = entity.color }}
                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>
                <Mail size={12} /> {entity.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 max-w-5xl">
        {/* Upcoming */}
        <div>
          <h2 className="font-display font-bold mb-4 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
            <Calendar size={16} style={{ color: entity.color }} /> Próximos eventos
          </h2>
          {loadingEvents ? (
            <div className="space-y-2">{[0,1].map((i) => <div key={i} className="shimmer h-16 rounded-xl" />)}</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Calendar size={28} className="mx-auto mb-2 opacity-30" style={{ color: entity.color }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem eventos próximos</p>
              {entity.is_member && (
                <button onClick={() => setShowEvent(true)} className="text-xs mt-2" style={{ color: entity.color }}>
                  + Criar evento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl border transition-all"
                     style={{ borderColor: ev.color + '33', background: ev.color + '08' }}
                     onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ev.color + '66' }}
                     onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ev.color + '33' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                        {ev.members_only && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: entity.color + '22', color: entity.color }}>
                            <Lock size={8} className="inline mr-0.5" />membros
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={9} className="inline mr-1" />
                        {format(parseISO(ev.start_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {ev.location && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={9} className="inline mr-1" />{ev.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past + Members note */}
        <div>
          {pastEvents.length > 0 && (
            <>
              <h2 className="font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Eventos anteriores</h2>
              <div className="space-y-2 opacity-60">
                {pastEvents.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl"
                       style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ev.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(ev.start_at), "d MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {!entity.is_member && (
            <div className="mt-4 p-4 rounded-xl"
                 style={{ background: entity.color + '0d', border: `1px solid ${entity.color}33` }}>
              <p className="text-sm font-medium mb-1" style={{ color: entity.color }}>
                <Lock size={12} className="inline mr-1.5" />Conteúdo exclusivo para membros
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Membros têm acesso a eventos privados, links exclusivos e conteúdo interno da entidade.
              </p>
              <button onClick={() => setShowJoin(true)} className="mt-2 text-xs font-medium transition-all"
                      style={{ color: entity.color }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
                Entrar com chave de acesso →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Entity card (grid) ────────────────────────────────────
function EntityCard({ entity, onClick }: { entity: Entity; onClick: () => void }) {
  return (
    <button onClick={onClick}
            className="card-hover text-left group flex flex-col gap-3 w-full"
            style={{ borderTop: `3px solid ${entity.color}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
             style={{ background: entity.color + '22', border: `1px solid ${entity.color}33` }}>
          {entity.icon_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: entity.color + '20', color: entity.color }}>
              {CATEGORY_LABELS[entity.category] ?? entity.category}
            </span>
            {entity.is_member && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <Shield size={8} /> membro
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
            {entity.short_name}
          </h3>
        </div>
        <ChevronRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-all mt-1"
                      style={{ color: entity.color }} />
      </div>
      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>
        {entity.description}
      </p>
      <div className="flex items-center gap-3 mt-auto pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Users size={10} /> {entity.member_count}
        </span>
        {entity.instagram_url && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Instagram size={10} /> Instagram
          </span>
        )}
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function EntitiesPage() {
  const [entities, setEntities]   = useState<Entity[]>([])
  const [selected, setSelected]   = useState<Entity | null>(null)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'member'>('all')

  useEffect(() => {
    api.get('/entities/')
      .then(({ data }) => setEntities(data))
      .catch(() => toast.error('Erro ao carregar entidades'))
      .finally(() => setLoading(false))
  }, [])

  const handleMembershipChange = (slug: string, is_member: boolean) => {
    setEntities((prev) => prev.map((e) => e.slug === slug
      ? { ...e, is_member, member_count: is_member ? e.member_count + 1 : Math.max(0, e.member_count - 1) }
      : e))
    if (selected?.slug === slug) {
      setSelected((s) => s ? { ...s, is_member, member_count: is_member ? s.member_count + 1 : Math.max(0, s.member_count - 1) } : s)
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <EntityDetail entity={selected} onBack={() => setSelected(null)} onMembershipChange={handleMembershipChange} />
      </div>
    )
  }

  const shown = filter === 'member' ? entities.filter((e) => e.is_member) : entities
  const memberCount = entities.filter((e) => e.is_member).length

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 animate-in"
              style={{ color: 'var(--text-primary)' }}>
            <Users size={22} style={{ color: 'var(--accent-3)' }} /> Entidades
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Organizações do curso de Sistemas de Informação · EACH-USP
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'member'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={filter === f
                      ? { background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }
                      : { color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {f === 'all' ? `Todas (${entities.length})` : `Minhas (${memberCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex gap-3"><div className="shimmer w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="shimmer h-3 w-16 rounded" /><div className="shimmer h-4 w-28 rounded" /></div></div>
              <div className="shimmer h-12 rounded" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{filter === 'member' ? 'Você ainda não é membro de nenhuma entidade' : 'Nenhuma entidade encontrada'}</p>
          {filter === 'member' && (
            <button onClick={() => setFilter('all')} className="text-xs mt-2" style={{ color: 'var(--accent-3)' }}>
              Ver todas as entidades →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((e, i) => (
            <div key={e.id} className="animate-in" style={{ animationDelay: `${i * 30}ms` }}>
              <EntityCard entity={e} onClick={() => setSelected(e)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
