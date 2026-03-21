import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  KanbanSquare, BookOpen, CalendarDays, TrendingUp, Clock,
  Globe, RefreshCw, Newspaper, ChevronRight, ChevronDown,
  Send, X, Users, KeyRound, Eye, Plus, Trash2,
  Sparkles, GraduationCap, Star, GripVertical, Settings2, RotateCcw,
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { useDashboardWidgets, WIDGET_DEFS, WidgetId } from '@/hooks/useDashboardWidgets'
import { EvaCountdown, NervHUD } from '@/components/EvaTimer'

interface Stats { boards: number; subjects: number; events: number; avgGrade: number | null }
interface Newsletter { id: string; title: string; body: string; author: string; created_at: string }

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}
const TYPE_COLORS: Record<string, string> = {
  exam: '#ef4444', deadline: '#f59e0b', academic: '#4d67f5',
  personal: '#10b981', work: '#ec4899', entity: '#a855f7',
}

// ── Newsletter Create Modal ───────────────────────────────────────────────────
function NewsletterCreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (n: Newsletter) => void
}) {
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [author, setAuthor] = useState('')
  const [key,    setKey]    = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!title.trim() || !body.trim() || !key.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/newsletter/', {
        title: title.trim(), body: body.trim(),
        author: author.trim() || undefined, key: key.trim(),
      })
      onCreated(data)
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
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent-3)' }} /> Nova Newsletter
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="label">Título *</label>
            <input className="input text-sm" placeholder="Ex: Semana de SI 2025"
                   value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Conteúdo *</label>
            <textarea className="input text-sm resize-none" rows={6}
                      placeholder="Escreva o conteúdo da newsletter..."
                      value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div>
            <label className="label">Autor <span className="normal-case" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
            <input className="input text-sm" placeholder="Ex: DASI"
                   value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><KeyRound size={11} /> Chave de acesso *</label>
            <input className="input text-sm" type="password"
                   placeholder="Chave secreta do servidor"
                   value={key} onChange={e => setKey(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && submit()} />
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
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Newspaper size={16} style={{ color: 'var(--accent-3)' }} />
            Newsletters <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>({newsletters.length})</span>
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2 pb-8">
          {newsletters.length === 0 && (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
              Nenhuma newsletter ainda.
            </p>
          )}
          {newsletters.map(n => (
            <div key={n.id} className="rounded-2xl overflow-hidden transition-all"
                 style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <button className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                      onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                      {n.author}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(n.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                </div>
                {expanded === n.id
                  ? <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />
                  : <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />}
              </button>
              {expanded === n.id && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pt-3"
                     style={{ color: 'var(--text-primary)' }}>{n.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user)
  const location = useLocation()
  const [stats,       setStats]      = useState<Stats>({ boards: 0, subjects: 0, events: 0, avgGrade: null })
  const [events,      setEvents]     = useState<any[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [latestNL,    setLatestNL]   = useState<Newsletter | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [refreshing,  setRefreshing] = useState(false)
  const [showCreateNL,  setShowCreateNL]  = useState(false)
  const [showArchiveNL, setShowArchiveNL] = useState(false)
  const [nlExpanded,    setNlExpanded]    = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const now = new Date()

  // Widget drag-and-drop
  const widgets = useDashboardWidgets()
  // Drag state for visual feedback
  const [dragOver, setDragOver] = useState<WidgetId | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [boards, subjects, evts, nlLatest, nlAll] = await Promise.all([
        api.get('/kanban/boards'),
        api.get('/grades/subjects'),
        api.get('/events/', { params: { start: now.toISOString() } }),
        api.get('/newsletter/latest').catch(() => ({ data: null })),
        api.get('/newsletter/').catch(() => ({ data: [] })),
      ])
      const allGrades = subjects.data.flatMap((s: any) => s.grades)
      const avg = allGrades.length
        ? allGrades.reduce((a: number, g: any) => a + g.value, 0) / allGrades.length
        : null
      setStats({ boards: boards.data.length, subjects: subjects.data.length, events: evts.data.length, avgGrade: avg })
      setEvents(evts.data.slice(0, 6))
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

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 max-w-5xl mx-auto w-full page-mobile">
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

      {/* ── WIDGET CUSTOMIZE BAR ─────────────────────────── */}
      <div className="flex items-center justify-end mb-2 gap-2">
        <button
          onClick={() => setShowCustomize(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: showCustomize ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            border: `1px solid ${showCustomize ? 'var(--accent-1)' : 'var(--border)'}`,
            color: showCustomize ? 'var(--accent-3)' : 'var(--text-muted)',
          }}
          title="Personalizar widgets da home"
        >
          <Settings2 size={12} />
          <span className="hidden sm:inline">Personalizar</span>
        </button>
      </div>

      {showCustomize && (
        <div className="mb-4 rounded-2xl p-4 animate-in"
             style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-3)' }}>
              Widgets · Arraste para reordenar
            </p>
            <button onClick={widgets.resetLayout}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    title="Resetar layout">
              <RotateCcw size={10} /> Resetar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {widgets.order.map(id => {
              const def = WIDGET_DEFS.find(w => w.id === id)!
              const isVisible = widgets.visible.has(id)
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => widgets.onDragStart(id)}
                  onDragOver={e => { e.preventDefault(); setDragOver(id) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => { widgets.onDrop(id); setDragOver(null) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all select-none"
                  style={{
                    background: dragOver === id ? 'var(--accent-soft)' : isVisible ? 'var(--bg-elevated)' : 'var(--bg-base)',
                    border: `1px solid ${dragOver === id ? 'var(--accent-1)' : isVisible ? 'var(--border-light)' : 'var(--border)'}`,
                    opacity: isVisible ? 1 : 0.45,
                    transform: dragOver === id ? 'scale(1.04)' : 'scale(1)',
                    boxShadow: dragOver === id ? '0 4px 16px var(--accent-glow)' : 'none',
                  }}
                >
                  <GripVertical size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 14 }}>{def.icon}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{def.label}</span>
                  <button
                    onClick={() => widgets.toggleVisible(id)}
                    className="ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: isVisible ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      border: `1px solid ${isVisible ? 'var(--accent-1)' : 'var(--border)'}`,
                      color: isVisible ? 'var(--accent-3)' : 'var(--text-muted)',
                      fontSize: 9,
                    }}
                    title={isVisible ? 'Ocultar widget' : 'Mostrar widget'}
                    aria-label={isVisible ? `Ocultar ${def.label}` : `Mostrar ${def.label}`}
                  >
                    {isVisible ? '✓' : '×'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Layout salvo automaticamente · Resetar restaura a ordem padrão
          </p>
        </div>
      )}
      {/* ── WIDGETS (ordered, visibility-controlled) ────── */}
      {widgets.order.map(widgetId => {
        if (!widgets.visible.has(widgetId)) return null

        // GREETING / HERO widget
        if (widgetId === 'greeting') return (
      <div key="greeting"
           className="hero-card relative overflow-hidden rounded-2xl mb-4 animate-in"
           draggable
           onDragStart={() => widgets.onDragStart('greeting')}
           onDragOver={e => widgets.onDragOver(e, 'greeting')}
           onDrop={() => widgets.onDrop('greeting')}
           style={{
             background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
             border: '1px solid var(--border)',
             boxShadow: '0 4px 40px var(--accent-glow)',
           }}>
        <div className="accent-orb" style={{ width: 260, height: 260, top: -110, right: -80, opacity: 0.12 }} />
        <div className="accent-orb" style={{ width: 120, height: 120, bottom: -40, left: 20, opacity: 0.06, animationDelay: '3s' }} />
        <div className="relative z-10 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-medium mb-1 capitalize" style={{ color: 'var(--text-muted)' }}>
                {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {greeting}, {firstName} {greetingEmoji}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="flex gap-2 flex-wrap">
              {stats.avgGrade !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: stats.avgGrade >= 5 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: stats.avgGrade >= 5 ? '#22c55e' : '#ef4444', border: `1px solid ${stats.avgGrade >= 5 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <TrendingUp size={11} /> {stats.avgGrade.toFixed(1)} média geral
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
                  <Clock size={11} /> {stats.events} evento{stats.events !== 1 ? 's' : ''} próximo{stats.events !== 1 ? 's' : ''}
                </div>
              )}
              {stats.boards > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                     style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <KanbanSquare size={11} /> {stats.boards} quadro{stats.boards !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        )

        // STATS widget (thin stat pills row — alternative to inline stats above)
        if (widgetId === 'stats') return null // stats are embedded in greeting; skip standalone

        // NEWSLETTER widget
        if (widgetId === 'newsletter') return (
        <div key="newsletter" className="mb-4 animate-in-delay-1"
             draggable
             onDragStart={() => widgets.onDragStart('newsletter')}
             onDragOver={e => widgets.onDragOver(e, 'newsletter')}
             onDrop={() => widgets.onDrop('newsletter')}>
          {loading ? (
            <div className="card shimmer h-28 rounded-2xl" />
          ) : latestNL ? (
          <div className="rounded-2xl overflow-hidden"
               style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between gap-3 px-5 py-3.5"
                 style={{ background: 'linear-gradient(90deg, var(--accent-soft), transparent)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
                  <Newspaper size={14} style={{ color: 'var(--accent-3)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--accent-3)' }}>Newsletter</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
                        className="btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1"
                        title="Ver todas">
                  <Eye size={11} /> <span className="hidden sm:inline">Histórico</span>
                </button>
                <button onClick={() => setShowCreateNL(true)}
                        className="btn-primary text-xs py-1.5 px-2.5 flex items-center gap-1">
                  <Plus size={11} /> <span className="hidden sm:inline">Nova</span>
                </button>
                <button onClick={() => setNlExpanded(v => !v)} className="p-1"
                        style={{ color: 'var(--text-muted)' }}>
                  {nlExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>

            {/* Body — collapsed preview or expanded */}
            <div className="px-5 py-3">
              {nlExpanded ? (
                <div className="animate-in">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                    {latestNL.body}
                  </p>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
                    por {latestNL.author} · {format(parseISO(latestNL.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              ) : (
                <p className="text-sm line-clamp-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}
                   onClick={() => setNlExpanded(true)}>
                  {latestNL.body}
                </p>
              )}
            </div>

            {/* Past newsletters preview strip */}
            {newsletters.length > 1 && (
              <div className="px-5 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {newsletters.slice(1, 4).map(n => (
                  <button key={n.id}
                          className="shrink-0 text-left px-3 py-2 rounded-xl transition-all hover:scale-[1.01]"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: 160, maxWidth: 200 }}
                          onClick={() => setShowArchiveNL(true)}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(n.created_at), "d MMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                  </button>
                ))}
                {newsletters.length > 4 && (
                  <button onClick={() => setShowArchiveNL(true)}
                          className="shrink-0 text-xs px-3 py-2 rounded-xl"
                          style={{ color: 'var(--accent-3)', background: 'var(--accent-soft)' }}>
                    +{newsletters.length - 4} mais
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl flex items-center justify-between gap-4 p-5"
               style={{ border: '1px dashed var(--border-light)', background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'var(--bg-elevated)' }}>
                <Newspaper size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Nenhuma newsletter ainda
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Publique comunicados para todos os usuários
                </p>
              </div>
            </div>
            <button onClick={() => setShowCreateNL(true)}
                    className="btn-primary text-xs py-2 px-4 shrink-0 flex items-center gap-1.5">
              <Send size={12} /> Publicar
            </button>
          </div>
          )}
        </div>
        ) // end newsletter widget

        // QUICKLINKS widget
        if (widgetId === 'quicklinks') return (
        <div key="quicklinks" className="animate-in-delay-2"
             draggable
             onDragStart={() => widgets.onDragStart('quicklinks')}
             onDragOver={e => widgets.onDragOver(e, 'quicklinks')}
             onDrop={() => widgets.onDrop('quicklinks')}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1"
             style={{ color: 'var(--text-muted)' }}>Acesso rápido</p>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 quick-links-grid">
            {[
              { to: '/kanban',   label: 'Kanban',      icon: KanbanSquare,  desc: 'Quadros', count: stats.boards, color: 'var(--accent-1)' },
              { to: '/grades',   label: 'Disciplinas', icon: BookOpen,      desc: 'Notas',   count: stats.subjects, color: '#a855f7' },
              { to: '/calendar', label: 'Calendário',  icon: CalendarDays,  desc: 'Eventos', count: stats.events,  color: '#f59e0b' },
              { to: '/entities', label: 'Entidades',   icon: Users,         desc: 'Grupos',  count: null, color: '#10b981' },
              { to: '/grades',   label: 'Fluxograma',  icon: GraduationCap, desc: 'Grade',   count: null, color: '#06b6d4' },
              { to: '/profile',  label: 'Perfil',      icon: Star,          desc: 'Conta',   count: null, color: '#ec4899' },
            ].map(({ to, label, icon: Icon, desc, count, color }) => (
              <Link key={label + to} to={to}
                    className="card-hover flex flex-col p-4 gap-2.5 group transition-all"
                    style={{ background: 'var(--bg-elevated)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                     style={{ background: color + '18', border: `1px solid ${color}33` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    {count !== null && count > 0 && (
                      <span className="font-display font-bold text-base leading-none" style={{ color }}>
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        ) // end quicklinks widget

        // EVENTS widget
        if (widgetId === 'events') return (
        <div key="events" className="animate-in-delay-3"
             draggable
             onDragStart={() => widgets.onDragStart('events')}
             onDragOver={e => widgets.onDragOver(e, 'events')}
             onDrop={() => widgets.onDrop('events')}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1"
             style={{ color: 'var(--text-muted)' }}>Próximos eventos</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0,1,2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer w-3 h-3 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="shimmer h-3.5 w-40 rounded" />
                      <div className="shimmer h-2.5 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-10 px-4" style={{ color: 'var(--text-muted)' }}>
                <CalendarDays size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento próximo</p>
                <Link to="/calendar" className="text-xs mt-1 inline-block" style={{ color: 'var(--accent-3)' }}>
                  + Criar evento
                </Link>
              </div>
            ) : (
              <>
                {events.map((ev: any, i: number) => {
                  const color = TYPE_COLORS[ev.event_type] ?? 'var(--accent-1)'
                  return (
                    <div key={ev.id}
                         className="flex items-center gap-3 px-4 py-3 transition-colors"
                         style={{ borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none' }}
                         onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                         onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5"
                           style={{ color: 'var(--text-primary)' }}>
                          {ev.is_global && <Globe size={10} style={{ color: 'var(--accent-3)' }} />}
                          {ev.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {format(parseISO(ev.start_at), "d MMM · HH:mm", { locale: ptBR })}
                          {' · '}
                          {formatDistanceToNow(parseISO(ev.start_at), { locale: ptBR, addSuffix: true })}
                        </p>
                        <EvaCountdown targetDate={ev.start_at} />
                      </div>
                      <span className="badge text-[10px] shrink-0"
                            style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
                        {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                    </div>
                  )
                })}
                <div className="px-4 py-3 text-right" style={{ borderTop: '1px solid var(--border)' }}>
                  <Link to="/calendar" className="text-xs font-medium" style={{ color: 'var(--accent-3)' }}>
                    Ver calendário completo →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
        ) // end events widget

        return null
      })}

      {/* NERV HUD — Eva theme only */}
      <NervHUD events={events} />
    </div>
  )
}
