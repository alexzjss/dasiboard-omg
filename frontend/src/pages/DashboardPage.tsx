import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  KanbanSquare, BookOpen, CalendarDays, TrendingUp, Clock,
  Globe, RefreshCw, Newspaper, ChevronRight, ChevronDown,
  Send, X, Users, KeyRound, Eye, Plus, Trash2,
  GraduationCap, Star, Zap, Target, ArrowRight,
  BookMarked, Bell, CheckCircle2, AlertTriangle, BarChart3,
  Pin, PinOff, Timer, Tag, Image as ImageIcon, Hash,
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, isToday, isTomorrow,
         differenceInDays, differenceInMinutes, areIntervalsOverlapping,
         startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { EvaCountdown, NervHUD } from '@/components/EvaTimer'
import { useStudyStats } from '@/hooks/useStudyStats'
import { MiniMarkdown } from '@/components/MiniMarkdown'
import { emitNotification } from '@/hooks/useNotifications'

interface Stats { boards: number; subjects: number; events: number; avgGrade: number | null }
interface Newsletter {
  id: string; title: string; body: string; author: string; created_at: string
  tag?: 'aviso' | 'oportunidade' | 'evento' | 'geral'
  image_url?: string
}

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}
const TYPE_COLORS: Record<string, string> = {
  exam: '#ef4444', deadline: '#f59e0b', academic: '#4d67f5',
  personal: '#10b981', work: '#ec4899', entity: '#a855f7',
}
const NL_TAGS: Record<string, { label: string; color: string; emoji: string }> = {
  aviso:       { label: 'Aviso',       color: '#f59e0b', emoji: '⚠️' },
  oportunidade:{ label: 'Oportunidade',color: '#22c55e', emoji: '🌟' },
  evento:      { label: 'Evento',      color: '#a855f7', emoji: '🎉' },
  geral:       { label: 'Geral',       color: '#6b7280', emoji: '📢' },
}

// ── Semestre progress localStorage ───────────────────────────────────────────
const SEM_KEY = 'dasiboard-semester'
interface SemesterConfig { start: string; end: string }
function loadSemester(): SemesterConfig {
  try { return JSON.parse(localStorage.getItem(SEM_KEY) ?? '{}') }
  catch { return { start: '', end: '' } }
}
function saveSemester(s: SemesterConfig) { localStorage.setItem(SEM_KEY, JSON.stringify(s)) }

// ── Focus do dia localStorage ─────────────────────────────────────────────────
const FOCUS_KEY = 'dasiboard-focus-day'
interface FocusDay { subjectId: string; subjectName: string; date: string; minutes: number }
function loadFocus(): FocusDay | null {
  try {
    const f = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null')
    if (!f) return null
    // Reset if not today
    if (f.date !== new Date().toISOString().slice(0, 10)) {
      localStorage.removeItem(FOCUS_KEY); return null
    }
    return f
  } catch { return null }
}
function saveFocus(f: FocusDay | null) {
  if (f) localStorage.setItem(FOCUS_KEY, JSON.stringify(f))
  else localStorage.removeItem(FOCUS_KEY)
}

// ── Newsletter Create Modal ───────────────────────────────────────────────────
function NewsletterCreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (n: Newsletter) => void
}) {
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [author,   setAuthor]   = useState('')
  const [key,      setKey]      = useState('')
  const [tag,      setTag]      = useState<Newsletter['tag']>('geral')
  const [imageUrl, setImageUrl] = useState('')
  const [preview,  setPreview]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    if (!title.trim() || !body.trim() || !key.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/newsletter/', {
        title: title.trim(), body: body.trim(),
        author: author.trim() || undefined, key: key.trim(),
        tag: tag || 'geral',
        image_url: imageUrl.trim() || undefined,
      })
      onCreated(data)
      // Notify the bell
      emitNotification({
        kind: 'system',
        title: `📰 Nova newsletter: ${title.trim()}`,
        body: author ? `por ${author.trim()}` : 'Publicada agora',
        emoji: NL_TAGS[tag ?? 'geral']?.emoji ?? '📢',
        href: '/',
      })
      toast.success('Newsletter publicada!')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail === 'Chave inválida'
        ? 'Chave inválida — verifique a chave do servidor' : 'Erro ao publicar')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in flex flex-col"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent-3)' }} /> Nova Newsletter
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(v => !v)}
                    className="btn-ghost text-xs py-1 px-2.5 gap-1"
                    style={{ color: preview ? 'var(--accent-3)' : 'var(--text-muted)' }}>
              <Eye size={11} /> {preview ? 'Editar' : 'Preview'}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {/* Tag selector */}
          <div>
            <label className="label flex items-center gap-1"><Tag size={11}/> Categoria</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(NL_TAGS).map(([k, v]) => (
                <button key={k} onClick={() => setTag(k as Newsletter['tag'])}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                        style={{
                          background: tag === k ? v.color + '22' : 'var(--bg-elevated)',
                          border: `1px solid ${tag === k ? v.color + '66' : 'var(--border)'}`,
                          color: tag === k ? v.color : 'var(--text-muted)',
                        }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Título *</label>
            <input className="input text-sm" placeholder="Ex: Semana de SI 2025"
                   value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Image URL */}
          <div>
            <label className="label flex items-center gap-1"><ImageIcon size={11}/> Imagem <span className="normal-case" style={{ color: 'var(--text-muted)' }}>(URL, opcional)</span></label>
            <input className="input text-sm" placeholder="https://exemplo.com/imagem.jpg"
                   value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>

          <div>
            <label className="label">Conteúdo * <span className="normal-case text-[10px]" style={{ color: 'var(--text-muted)' }}>— suporta **negrito**, *itálico*, [link](url), ![img](url), # título, - lista</span></label>
            {preview ? (
              <div className="input min-h-[120px] overflow-y-auto" style={{ background: 'var(--bg-elevated)' }}>
                {imageUrl && <img src={imageUrl} alt="capa" style={{ width:'100%', borderRadius:8, marginBottom:8, objectFit:'cover', maxHeight:160 }} />}
                <MiniMarkdown text={body} />
              </div>
            ) : (
              <textarea className="input text-sm resize-none" rows={6}
                        placeholder={'**Negrito**, *itálico*, [link](url)\n\n![Imagem](url)\n\n- Item de lista\n\n> Destaque'}
                        value={body} onChange={e => setBody(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Autor <span className="normal-case" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input className="input text-sm" placeholder="Ex: DASI"
                     value={author} onChange={e => setAuthor(e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1"><KeyRound size={11} /> Chave *</label>
              <input className="input text-sm" type="password"
                     placeholder="Chave secreta" value={key}
                     onChange={e => setKey(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1 justify-center" onClick={submit} disabled={loading}>
              <Send size={13} /> {loading ? 'Publicando...' : 'Publicar'}
            </button>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Newsletter Archive Modal ──────────────────────────────────────────────────
function NewsletterArchiveModal({ newsletters, onClose }: {
  newsletters: Newsletter[]; onClose: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(newsletters[0]?.id ?? null)
  const [filterTag, setFilterTag] = useState<string>('all')

  const shown = filterTag === 'all' ? newsletters : newsletters.filter(n => n.tag === filterTag)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in flex flex-col"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent-3)' }} />
            Newsletters <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>({newsletters.length})</span>
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Tag filter */}
        <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setFilterTag('all')}
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{ background: filterTag==='all'?'var(--accent-soft)':'var(--bg-elevated)', color: filterTag==='all'?'var(--accent-3)':'var(--text-muted)', border: '1px solid var(--border)' }}>
            Todas
          </button>
          {Object.entries(NL_TAGS).map(([k, v]) => (
            <button key={k} onClick={() => setFilterTag(k)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                    style={{ background: filterTag===k ? v.color+'22' : 'var(--bg-elevated)', color: filterTag===k ? v.color : 'var(--text-muted)', border: `1px solid ${filterTag===k ? v.color+'44' : 'var(--border)'}` }}>
              {v.emoji} {v.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 space-y-2 pb-8 overflow-y-auto flex-1">
          {shown.length === 0 && (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Nenhuma newsletter nessa categoria.</p>
          )}
          {shown.map(n => {
            const tagInfo = NL_TAGS[n.tag ?? 'geral']
            return (
              <div key={n.id} className="rounded-2xl overflow-hidden transition-all"
                   style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <button className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                        onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {tagInfo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: tagInfo.color+'18', color: tagInfo.color }}>
                          {tagInfo.emoji} {tagInfo.label}
                        </span>
                      )}
                      {n.author && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                          {n.author}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {format(parseISO(n.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                  </div>
                  {expanded === n.id
                    ? <ChevronDown size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    : <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                </button>
                {expanded === n.id && (
                  <div className="px-4 pb-4 animate-in" style={{ borderTop: '1px solid var(--border)' }}>
                    {n.image_url && (
                      <img src={n.image_url} alt="capa" style={{ width:'100%', borderRadius:8, marginTop:12, marginBottom:8, objectFit:'cover', maxHeight:180 }} />
                    )}
                    <div className="pt-3">
                      <MiniMarkdown text={n.body} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Quick Link Card ───────────────────────────────────────────────────────────
function QuickLink({ to, label, icon: Icon, color, count, desc, badge }: {
  to: string; label: string; icon: React.ElementType; color: string
  count?: number | null; desc: string; badge?: string
}) {
  return (
    <Link to={to}
          className="quick-link-card group relative flex flex-col gap-2.5 p-3.5 md:p-4 rounded-2xl overflow-hidden select-none"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = color + '55'
            el.style.boxShadow = `0 8px 28px ${color}18, 0 0 0 1px ${color}22`
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'var(--border)'
            el.style.boxShadow = ''
          }}>
      {/* Background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 30% 0%, ${color}10 0%, transparent 65%)` }} />
      {/* Icon + count */}
      <div className="flex items-start justify-between relative z-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]"
             style={{ background: color + '15', border: `1px solid ${color}30` }}>
          <Icon size={17} style={{ color }} />
        </div>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: color + '20', color, border: `1px solid ${color}30` }}>{badge}</span>
        )}
        {count !== null && count !== undefined && count > 0 && (
          <span className="font-display font-bold text-base leading-none" style={{ color }}>{count}</span>
        )}
      </div>
      {/* Label */}
      <div className="relative z-10">
        <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </Link>
  )
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────
function StatChip({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
         style={{ background: color + '12', border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
      <div>
        <p className="font-display font-bold text-base leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  )
}

// ── Semester Progress Widget ──────────────────────────────────────────────────
function SemesterWidget() {
  const [cfg, setCfg] = useState<SemesterConfig>(loadSemester)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cfg)

  const save = () => { saveSemester(draft); setCfg(draft); setEditing(false) }

  const now = new Date()
  const start = cfg.start ? new Date(cfg.start) : null
  const end   = cfg.end   ? new Date(cfg.end)   : null

  const pct = (start && end && now >= start && now <= end)
    ? Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)
    : null

  const weeksLeft = (end && now < end)
    ? Math.ceil((end.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null

  const radius = 36, circ = 2 * Math.PI * radius

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Semestre</p>
        <button onClick={() => { setDraft(cfg); setEditing(v => !v) }}
                className="text-[10px] font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent-3)' }}>
          {editing ? 'Cancelar' : 'Configurar'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2 animate-in">
          <div>
            <label className="label text-[10px]">Início</label>
            <input type="date" className="input text-sm" value={draft.start}
                   onChange={e => setDraft(d => ({ ...d, start: e.target.value }))} />
          </div>
          <div>
            <label className="label text-[10px]">Fim</label>
            <input type="date" className="input text-sm" value={draft.end}
                   onChange={e => setDraft(d => ({ ...d, end: e.target.value }))} />
          </div>
          <button onClick={save} className="btn-primary w-full justify-center text-xs py-1.5">Salvar</button>
        </div>
      ) : pct !== null ? (
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              {/* Track */}
              <circle cx="44" cy="44" r={radius} fill="none"
                      stroke="var(--bg-elevated)" strokeWidth="7" />
              {/* Progress */}
              <circle cx="44" cy="44" r={radius} fill="none"
                      stroke="var(--accent-1)" strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - pct/100)}
                      transform="rotate(-90 44 44)"
                      style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
              <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>concluído</span>
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            {weeksLeft !== null && (
              <div>
                <p className="font-display font-bold text-2xl leading-none" style={{ color: weeksLeft <= 2 ? '#ef4444' : weeksLeft <= 4 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {weeksLeft}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>semana{weeksLeft !== 1 ? 's' : ''} restante{weeksLeft !== 1 ? 's' : ''}</p>
              </div>
            )}
            {end && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Fim: {format(end, "d 'de' MMM", { locale: ptBR })}
              </p>
            )}
            {start && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Início: {format(start, "d 'de' MMM", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
          <GraduationCap size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">Configure as datas do semestre</p>
          <button onClick={() => setEditing(true)} className="text-xs mt-1 hover:opacity-70"
                  style={{ color: 'var(--accent-3)' }}>+ Configurar</button>
        </div>
      )}
    </div>
  )
}

// ── Próximas 48h Timeline ─────────────────────────────────────────────────────
function Timeline48h({ events }: { events: any[] }) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const upcoming = events
    .filter(e => {
      const d = parseISO(e.start_at)
      return d >= now && d <= cutoff
    })
    .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())

  // Detect conflicts: events that overlap in time
  const conflictIds = new Set<string>()
  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const a = upcoming[i], b = upcoming[j]
      const aEnd = a.end_at ? parseISO(a.end_at) : new Date(parseISO(a.start_at).getTime() + 60*60*1000)
      const bEnd = b.end_at ? parseISO(b.end_at) : new Date(parseISO(b.start_at).getTime() + 60*60*1000)
      if (areIntervalsOverlapping(
        { start: parseISO(a.start_at), end: aEnd },
        { start: parseISO(b.start_at), end: bEnd },
      )) {
        conflictIds.add(a.id); conflictIds.add(b.id)
      }
    }
  }

  if (upcoming.length === 0) return (
    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
      <CalendarDays size={24} className="mx-auto mb-2 opacity-30" />
      <p className="text-xs">Sem eventos nas próximas 48h</p>
    </div>
  )

  let lastDay = ''

  return (
    <div className="space-y-0">
      {upcoming.map((ev, i) => {
        const d       = parseISO(ev.start_at)
        const dayKey  = format(d, 'yyyy-MM-dd')
        const isConflict = conflictIds.has(ev.id)
        const evColor = isConflict ? '#f97316' : (TYPE_COLORS[ev.event_type] ?? 'var(--accent-1)')
        const showDay = dayKey !== lastDay
        lastDay = dayKey

        const minsUntil = differenceInMinutes(d, now)
        const timeLabel = minsUntil < 60
          ? `em ${minsUntil}min`
          : isToday(d)
          ? `hoje ${format(d, 'HH:mm')}`
          : `amanhã ${format(d, 'HH:mm')}`

        return (
          <div key={ev.id}>
            {showDay && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest px-2"
                      style={{ color: 'var(--text-muted)' }}>
                  {isToday(d) ? '⚡ Hoje' : '📅 Amanhã'}
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
            )}
            <div className="flex items-start gap-3 py-2.5 px-1 relative group">
              {/* Timeline line */}
              {i < upcoming.length - 1 && (
                <div className="absolute left-[14px] top-[28px] bottom-0 w-px"
                     style={{ background: 'var(--border)', opacity: 0.5 }} />
              )}
              {/* Dot */}
              <div className="w-[7px] h-[7px] rounded-full mt-2 shrink-0 relative z-10"
                   style={{ background: evColor, boxShadow: isConflict ? `0 0 8px ${evColor}` : 'none',
                     outline: isConflict ? `2px solid ${evColor}44` : 'none', outlineOffset: 2 }} />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {ev.title}
                  </p>
                  <span className="text-[10px] font-mono shrink-0 mt-0.5"
                        style={{ color: isConflict ? '#f97316' : 'var(--text-muted)' }}>
                    {timeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: evColor + '18', color: evColor }}>
                    {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                  </span>
                  {isConflict && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                      ⚠️ Conflito
                    </span>
                  )}
                  {ev.location && (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>📍 {ev.location}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Foco do Dia Widget ────────────────────────────────────────────────────────
function FocusWidget({ subjects }: { subjects: any[] }) {
  const [focus, setFocus]     = useState<FocusDay | null>(loadFocus)
  const [picking, setPicking] = useState(false)
  const [elapsed, setElapsed] = useState(focus?.minutes ?? 0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number | null>(null)

  // Timer that accumulates minutes
  useEffect(() => {
    if (!focus) { if (timerRef.current) clearInterval(timerRef.current); return }
    startRef.current = Date.now() - (focus.minutes * 60 * 1000)
    timerRef.current = setInterval(() => {
      const mins = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 60000)
      setElapsed(mins)
      saveFocus({ ...focus, minutes: mins })
    }, 10000) // update every 10s
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [focus?.subjectId])

  const selectSubject = (s: any) => {
    const f: FocusDay = { subjectId: s.id, subjectName: s.name, date: new Date().toISOString().slice(0,10), minutes: 0 }
    setFocus(f); saveFocus(f); setElapsed(0); setPicking(false)
    startRef.current = Date.now()
    toast.success(`Foco: ${s.name}`)
  }

  const clear = () => { setFocus(null); saveFocus(null); setElapsed(0); if (timerRef.current) clearInterval(timerRef.current) }

  const h = Math.floor(elapsed / 60), m = elapsed % 60

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Target size={10} /> Foco do dia
        </p>
        {focus && (
          <button onClick={clear} className="text-[10px] hover:opacity-70 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <PinOff size={10} /> Remover
          </button>
        )}
      </div>

      {focus ? (
        <div className="animate-in">
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'var(--accent-1)' }}>
              <Pin size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {focus.subjectName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Timer size={10} style={{ color: 'var(--accent-3)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--accent-3)' }}>
                  {h > 0 ? `${h}h ` : ''}{m}min hoje
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setPicking(true)}
                  className="mt-2 w-full text-xs py-1.5 rounded-xl transition-all hover:opacity-80"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            Trocar disciplina
          </button>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Defina uma disciplina como foco do dia
          </p>
          <button onClick={() => setPicking(true)} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
            <Pin size={11} /> Escolher foco
          </button>
        </div>
      )}

      {picking && subjects.length > 0 && (
        <div className="mt-3 animate-in space-y-1 max-h-40 overflow-y-auto">
          {subjects.map((s: any) => (
            <button key={s.id} onClick={() => selectSubject(s)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80 flex items-center gap-2"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
          <button onClick={() => setPicking(false)} className="w-full text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const studyStats = useStudyStats()
  const [stats,       setStats]      = useState<Stats>({ boards: 0, subjects: 0, events: 0, avgGrade: null })
  const [events,      setEvents]     = useState<any[]>([])
  const [subjects,    setSubjects]   = useState<any[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [latestNL,    setLatestNL]   = useState<Newsletter | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [refreshing,  setRefreshing] = useState(false)
  const [showCreateNL,  setShowCreateNL]  = useState(false)
  const [showArchiveNL, setShowArchiveNL] = useState(false)
  const [nlExpanded,    setNlExpanded]    = useState(false)
  const now = new Date()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [boards, subs, evts, nlLatest, nlAll] = await Promise.all([
        api.get('/kanban/boards'),
        api.get('/grades/subjects'),
        api.get('/events/', { params: { start: now.toISOString() } }),
        api.get('/newsletter/latest').catch(() => ({ data: null })),
        api.get('/newsletter/').catch(() => ({ data: [] })),
      ])
      const allGrades = subs.data.flatMap((s: any) => s.grades)
      const avg = allGrades.length
        ? allGrades.reduce((a: number, g: any) => a + g.value, 0) / allGrades.length
        : null
      setStats({ boards: boards.data.length, subjects: subs.data.length, events: evts.data.length, avgGrade: avg })
      setEvents(evts.data)
      setSubjects(subs.data)
      setLatestNL(nlLatest.data)
      setNewsletters(nlAll.data)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [location.pathname])

  const hour = now.getHours()
  const greeting = hour < 5 ? 'Boa noite' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const greetingEmoji = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'
  const firstName = user?.full_name?.split(' ')[0] ?? 'aluno'

  const urgentEvent = events.find((ev: any) => {
    const d = parseISO(ev.start_at)
    return isToday(d) || isTomorrow(d) || differenceInDays(d, now) <= 3
  })

  const quickLinks = [
    { to: '/kanban',   label: 'Kanban',      icon: KanbanSquare,  desc: 'Organize tarefas',    color: 'var(--accent-1)',  count: stats.boards },
    { to: '/grades',   label: 'Disciplinas', icon: BookOpen,      desc: 'Notas e frequência',  color: '#a855f7',          count: stats.subjects },
    { to: '/calendar', label: 'Calendário',  icon: CalendarDays,  desc: 'Provas e eventos',    color: '#f59e0b',          count: stats.events },
    { to: '/entities', label: 'Entidades',   icon: Users,         desc: 'Grupos do curso',     color: '#10b981',          count: null },
    { to: '/docentes', label: 'Docentes',    icon: BookMarked,    desc: 'Professores da EACH', color: '#06b6d4',          count: null },
    { to: '/profile',  label: 'Perfil',      icon: Star,          desc: 'Conquistas e cartão', color: '#ec4899',          count: null },
  ]

  const latestTag = latestNL?.tag ? NL_TAGS[latestNL.tag] : NL_TAGS['geral']

  return (
    <div className="px-4 py-4 sm:px-5 md:px-8 md:py-6 max-w-6xl mx-auto w-full page-mobile space-y-4 md:space-y-5">

      {showCreateNL && (
        <NewsletterCreateModal
          onClose={() => setShowCreateNL(false)}
          onCreated={(n) => { setLatestNL(n); setNewsletters(p => [n, ...p]) }}
        />
      )}
      {showArchiveNL && (
        <NewsletterArchiveModal
          newsletters={newsletters}
          onClose={() => setShowArchiveNL(false)}
        />
      )}

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="hero-card relative overflow-hidden rounded-2xl animate-in"
           style={{
             background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
             border: '1px solid var(--border)',
             boxShadow: '0 4px 40px var(--accent-glow)',
           }}>
        <div className="accent-orb" style={{ width: 300, height: 300, top: -120, right: -80, opacity: 0.10 }} />
        <div className="accent-orb" style={{ width: 140, height: 140, bottom: -40, left: 10, opacity: 0.05, animationDelay: '3.5s' }} />

        <div className="relative z-10 p-5 md:p-7">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-medium mb-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {greeting}, {firstName} {greetingEmoji}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Sistemas de Informação · EACH · USP
              </p>
            </div>
            <button onClick={() => load(true)} title="Atualizar"
                    className={`btn-ghost p-2 shrink-0 ${refreshing ? 'animate-spin' : ''}`}
                    disabled={refreshing}>
              <RefreshCw size={15} />
            </button>
          </div>

          {!loading && (
            <div className="flex flex-wrap gap-2">
              {stats.avgGrade !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: stats.avgGrade >= 5 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: stats.avgGrade >= 5 ? '#22c55e' : '#ef4444', border: `1px solid ${stats.avgGrade >= 5 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <TrendingUp size={11} /> {stats.avgGrade.toFixed(1)} média
                </div>
              )}
              {stats.subjects > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
                  <BookOpen size={11} /> {stats.subjects} disciplina{stats.subjects !== 1 ? 's' : ''}
                </div>
              )}
              {stats.events > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Clock size={11} /> {stats.events} evento{stats.events !== 1 ? 's' : ''}
                </div>
              )}
              {studyStats.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
                  🔥 {studyStats.streak} dia{studyStats.streak !== 1 ? 's' : ''} de sequência
                </div>
              )}
            </div>
          )}

          {!loading && urgentEvent && (
            <button onClick={() => navigate('/calendar')}
                    className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80 active:scale-[0.99]"
                    style={{ background: TYPE_COLORS[urgentEvent.event_type] + '14', border: `1px solid ${TYPE_COLORS[urgentEvent.event_type]}33` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                   style={{ background: TYPE_COLORS[urgentEvent.event_type] + '22' }}>
                <Bell size={14} style={{ color: TYPE_COLORS[urgentEvent.event_type] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: TYPE_COLORS[urgentEvent.event_type] }}>
                  {isToday(parseISO(urgentEvent.start_at)) ? '⚡ Hoje' : isTomorrow(parseISO(urgentEvent.start_at)) ? '📅 Amanhã' : `📅 Em ${differenceInDays(parseISO(urgentEvent.start_at), now)} dias`}
                  {' · '}{TYPE_LABELS[urgentEvent.event_type] ?? urgentEvent.event_type}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{urgentEvent.title}</p>
              </div>
              <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── QUICK LINKS ─────────────────────────────────────────────────── */}
      <div className="animate-in-delay-1">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {quickLinks.map(ql => (
            <QuickLink key={ql.to} {...ql} />
          ))}
        </div>
      </div>

      {/* ── MAIN GRID: 48h timeline + stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-5 animate-in-delay-2">

        {/* 48h Timeline — 3 cols */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Próximas 48h</p>
            <Link to="/calendar" className="text-[10px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent-3)' }}>
              Ver todos <ArrowRight size={10} />
            </Link>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer w-2 h-2 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="shimmer h-3.5 w-40 rounded" />
                      <div className="shimmer h-2.5 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Timeline48h events={events} />
            )}
          </div>
        </div>

        {/* Study stats + widgets — 2 cols */}
        <div className="lg:col-span-2 space-y-4">

          {/* Semester progress */}
          <SemesterWidget />

          {/* Foco do dia */}
          {!loading && <FocusWidget subjects={subjects} />}

          {/* Study stats */}
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Estudo</p>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>últimos 30 dias</span>
            </div>
            <div className="card space-y-3">
              <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>
                  {studyStats.streak >= 7 ? '🔥' : studyStats.streak >= 3 ? '⚡' : '📅'}
                </span>
                <div>
                  <p className="font-display font-bold text-xl leading-none"
                     style={{ color: studyStats.streak > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                    {studyStats.streak} dia{studyStats.streak !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {studyStats.streak === 0 ? 'Comece hoje!' : 'Sequência 🔥'}
                  </p>
                </div>
              </div>

              {/* Mini heatmap */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Atividade</p>
                <div className="flex gap-1">
                  {Array.from({ length: 14 }, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - 13 + i)
                    const key = d.toISOString().slice(0, 10)
                    const active = studyStats.sessionDates.includes(key)
                    return (
                      <div key={key} className="flex-1 h-4 rounded-sm" title={key}
                           style={{ background: active ? 'var(--accent-1)' : 'var(--bg-elevated)', border: '1px solid var(--border)', opacity: active ? 1 : 0.5 }} />
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '🍅', value: Math.floor(studyStats.pomodoroMinutes / 25), label: 'Pomodoros', color: '#ef4444' },
                  { emoji: '⏱️', value: `${Math.floor(studyStats.pomodoroMinutes / 60)}h${studyStats.pomodoroMinutes % 60 > 0 ? `${studyStats.pomodoroMinutes % 60}m` : ''}`, label: 'Estudando', color: '#06b6d4' },
                  { emoji: '⚡', value: studyStats.flashcardsAnswered, label: 'Flashcards', color: '#22c55e' },
                  { emoji: '📝', value: studyStats.notesCreated, label: 'Anotações', color: '#f59e0b' },
                ].map(s => (
                  <StatChip key={s.label} {...s} />
                ))}
              </div>

              <Link to="/profile"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <BarChart3 size={12} /> Ver estatísticas completas
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── NEWSLETTER ──────────────────────────────────────────────────── */}
      <div className="animate-in-delay-3">
        {loading ? (
          <div className="card shimmer h-20 rounded-2xl" />
        ) : latestNL ? (
          <div className="rounded-2xl overflow-hidden"
               style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between gap-3 px-4 py-3"
                 style={{ background: 'linear-gradient(90deg, var(--accent-soft), transparent)', borderBottom: nlExpanded ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: latestTag ? latestTag.color + '22' : 'var(--accent-soft)', border: `1px solid ${latestTag ? latestTag.color + '44' : 'var(--accent-1)'}` }}>
                  <span style={{ fontSize: 13 }}>{latestTag?.emoji ?? '📢'}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {latestTag && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: latestTag.color + '18', color: latestTag.color }}>
                        {latestTag.label}
                      </span>
                    )}
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(parseISO(latestNL.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <button className="text-sm font-bold text-left hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => setNlExpanded(v => !v)}>
                    {latestNL.title}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowArchiveNL(true)}
                        className="btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1">
                  <Eye size={11} /> <span className="hidden sm:inline">Histórico</span>
                </button>
                <button onClick={() => setShowCreateNL(true)}
                        className="btn-primary text-xs py-1.5 px-2.5 flex items-center gap-1">
                  <Plus size={11} /> <span className="hidden sm:inline">Nova</span>
                </button>
                <button onClick={() => setNlExpanded(v => !v)} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  {nlExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
            {nlExpanded && (
              <div className="px-5 py-4 animate-in">
                {latestNL.image_url && (
                  <img src={latestNL.image_url} alt="capa"
                       style={{ width:'100%', borderRadius:10, marginBottom:12, objectFit:'cover', maxHeight:200 }} />
                )}
                <MiniMarkdown text={latestNL.body} />
                <p className="text-[11px] mt-4 pt-3" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                  {latestNL.author && `por ${latestNL.author} · `}
                  {format(parseISO(latestNL.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl flex items-center justify-between gap-4 p-4"
               style={{ border: '1px dashed var(--border-light)', background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <Newspaper size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhuma newsletter</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Publique comunicados para todos</p>
              </div>
            </div>
            <button onClick={() => setShowCreateNL(true)} className="btn-primary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5">
              <Send size={12} /> Publicar
            </button>
          </div>
        )}
      </div>

      {/* NERV HUD */}
      <NervHUD events={events} />
    </div>
  )
}
