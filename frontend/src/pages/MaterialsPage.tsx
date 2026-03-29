// ── Materiais de Estudo — /materials ──────────────────────────────────────────
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  BookOpen, Link2, Upload, Plus, X, Search, Filter,
  Download, ExternalLink, Trash2, KeyRound, Globe,
  FileText, Video, Headphones, BookMarked, FlaskConical,
  Star, StarOff, ChevronDown, ChevronUp, Tag, FolderOpen,
  SortAsc, SortDesc, Grid2X2, List, Eye, Calendar,
  AlertCircle, Check, Loader2, Pencil, Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import clsx from 'clsx'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'

// ── Types ─────────────────────────────────────────────────────────────────────
type MaterialCategory = 'aula' | 'exercicio' | 'livro' | 'video' | 'artigo' | 'podcast' | 'outro'
type MaterialType     = 'link' | 'file'
type SortField        = 'title' | 'created_at' | 'category' | 'subject'
type ViewMode         = 'grid' | 'list'

interface Material {
  id: string
  title: string
  description?: string
  category: MaterialCategory
  type: MaterialType
  url?: string
  file_url?: string
  file_name?: string
  file_size?: number
  subject?: string
  tags: string[]
  is_global: boolean
  created_at: string
  created_by?: string
  semester?: string
  // stored locally only:
  starred?: boolean
}

interface MaterialFormData {
  title: string
  description: string
  category: MaterialCategory
  type: MaterialType
  url: string
  subject: string
  tags: string
  is_global: boolean
  semester: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES: { value: MaterialCategory; label: string; emoji: string; color: string }[] = [
  { value: 'aula',      label: 'Aula',        emoji: '📚', color: '#4d67f5' },
  { value: 'exercicio', label: 'Exercício',    emoji: '✏️', color: '#f59e0b' },
  { value: 'livro',     label: 'Livro',        emoji: '📖', color: '#22c55e' },
  { value: 'video',     label: 'Vídeo',        emoji: '🎬', color: '#ef4444' },
  { value: 'artigo',    label: 'Artigo',       emoji: '📄', color: '#a855f7' },
  { value: 'podcast',   label: 'Podcast',      emoji: '🎙️', color: '#ec4899' },
  { value: 'outro',     label: 'Outro',        emoji: '📎', color: '#6b7280' },
]

const CAT_ICON: Record<MaterialCategory, React.ReactNode> = {
  aula:      <BookOpen     size={14} />,
  exercicio: <FlaskConical size={14} />,
  livro:     <BookMarked   size={14} />,
  video:     <Video        size={14} />,
  artigo:    <FileText     size={14} />,
  podcast:   <Headphones   size={14} />,
  outro:     <FolderOpen   size={14} />,
}

const STORAGE_KEY = 'dasiboard-materials-v1'
const STARRED_KEY = 'dasiboard-materials-starred'

function loadLocal(): Material[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveLocal(mats: Material[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mats)) } catch {}
}
function loadStarred(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STARRED_KEY) ?? '[]')) } catch { return new Set() }
}
function saveStarred(ids: Set<string>) {
  try { localStorage.setItem(STARRED_KEY, JSON.stringify([...ids])) } catch {}
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Material Form Modal ───────────────────────────────────────────────────────
function MaterialForm({
  onClose, onSave, editing, globalKey, setGlobalKey,
}: {
  onClose: () => void
  onSave: (data: MaterialFormData, file?: File) => Promise<void>
  editing?: Material
  globalKey: string
  setGlobalKey: (v: string) => void
}) {
  const [form, setForm] = useState<MaterialFormData>({
    title:       editing?.title       ?? '',
    description: editing?.description ?? '',
    category:    editing?.category    ?? 'aula',
    type:        editing?.type        ?? 'link',
    url:         editing?.url         ?? '',
    subject:     editing?.subject     ?? '',
    tags:        editing?.tags?.join(', ') ?? '',
    is_global:   editing?.is_global   ?? false,
    semester:    editing?.semester    ?? '',
  })
  const [file,    setFile]    = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [tagInput, setTagInput] = useState(editing?.tags?.join(', ') ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof MaterialFormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return }
    if (form.type === 'link' && !form.url.trim()) { toast.error('URL é obrigatória'); return }
    if (form.type === 'file' && !file && !editing) { toast.error('Selecione um arquivo'); return }
    if (form.is_global && !globalKey) { toast.error('Informe a chave de acesso global'); return }
    setLoading(true)
    try {
      await onSave({ ...form, tags: tagInput }, file ?? undefined)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Erro ao salvar material')
    } finally { setLoading(false) }
  }

  const cat = CATEGORIES.find(c => c.value === form.category)!

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col animate-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          maxHeight: '92dvh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <h3 className="font-display font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-3)' }} />
            {editing ? 'Editar material' : 'Novo material'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['link', 'file'] as const).map(t => (
                <button key={t} onClick={() => set('type', t)}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: form.type === t ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          border: `1px solid ${form.type === t ? 'var(--accent-1)' : 'var(--border)'}`,
                          color: form.type === t ? 'var(--accent-3)' : 'var(--text-secondary)',
                        }}>
                  {t === 'link' ? <Link2 size={14}/> : <Upload size={14}/>}
                  {t === 'link' ? 'Link/URL' : 'Upload'}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Título *
            </label>
            <input className="input w-full text-sm" placeholder="Ex: Slides de Banco de Dados — Aula 5"
                   value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Categoria
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => set('category', c.value)}
                        className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-semibold transition-all"
                        style={{
                          background: form.category === c.value ? c.color + '22' : 'var(--bg-elevated)',
                          border: `1.5px solid ${form.category === c.value ? c.color : 'var(--border)'}`,
                          color: form.category === c.value ? c.color : 'var(--text-muted)',
                        }}>
                  <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL ou File */}
          {form.type === 'link' ? (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                URL *
              </label>
              <input className="input w-full text-sm" type="url"
                     placeholder="https://..."
                     value={form.url} onChange={e => set('url', e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                Arquivo {!editing && '*'}
              </label>
              <input ref={fileRef} type="file" className="hidden"
                     accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.zip,.mp4,.mp3"
                     onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm border-dashed transition-all"
                      style={{ border: `2px dashed ${file ? 'var(--accent-1)' : 'var(--border)'}`, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                {file ? (
                  <>
                    <Check size={14} style={{ color: 'var(--accent-3)' }} />
                    <span className="truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({fmtSize(file.size)})</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Clique para selecionar arquivo
                  </>
                )}
              </button>
              {editing?.file_name && !file && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Arquivo atual: {editing.file_name}
                </p>
              )}
            </div>
          )}

          {/* Disciplina + Semestre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                Disciplina
              </label>
              <input className="input w-full text-sm" placeholder="Ex: BCC2001"
                     value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                Semestre
              </label>
              <input className="input w-full text-sm" placeholder="Ex: 2024.1"
                     value={form.semester} onChange={e => set('semester', e.target.value)} />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Descrição
            </label>
            <textarea className="input w-full text-sm resize-none" rows={3}
                      placeholder="Descreva o conteúdo, contexto ou como usar este material..."
                      value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Tags <span style={{ fontWeight: 400 }}>(separadas por vírgula)</span>
            </label>
            <input className="input w-full text-sm" placeholder="banco-de-dados, sql, nosql, otimização"
                   value={tagInput} onChange={e => setTagInput(e.target.value)} />
          </div>

          {/* Global toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: form.is_global ? 'rgba(168,85,247,0.08)' : 'var(--bg-elevated)', border: `1px solid ${form.is_global ? '#a855f7' : 'var(--border)'}` }}>
            <Globe size={16} style={{ color: form.is_global ? '#a855f7' : 'var(--text-muted)', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Material global</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Visível para todos os usuários do curso</p>
            </div>
            <button onClick={() => set('is_global', !form.is_global)}
                    className="w-10 h-6 rounded-full transition-all relative"
                    style={{ background: form.is_global ? '#a855f7' : 'var(--border)' }}>
              <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                   style={{ left: form.is_global ? 22 : 2 }} />
            </button>
          </div>

          {form.is_global && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
                 style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <KeyRound size={14} style={{ color: '#a855f7', flexShrink: 0 }} />
              <input className="input flex-1 text-sm" type="password"
                     placeholder="Chave de acesso global"
                     value={globalKey} onChange={e => setGlobalKey(e.target.value)} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 shrink-0 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Material Card (grid view) ─────────────────────────────────────────────────
function MaterialCard({
  mat, starred, onToggleStar, onOpen, onDelete, onEdit,
}: {
  mat: Material
  starred: boolean
  onToggleStar: () => void
  onOpen: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const cat = CATEGORIES.find(c => c.value === mat.category)!
  const ago = formatDistanceToNow(parseISO(mat.created_at), { locale: ptBR, addSuffix: true })

  return (
    <div
      className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01] animate-in"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* Category stripe */}
      <div className="h-1 w-full" style={{ background: cat.color }} />

      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                  style={{ background: cat.color + '22', color: cat.color }}>
              {CAT_ICON[mat.category]}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
              {cat.label}
            </span>
            {mat.is_global && (
              <Globe size={10} style={{ color: '#a855f7', flexShrink: 0 }} aria-label="Global" />
            )}
          </div>
          <button onClick={onToggleStar}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                  style={{ color: starred ? '#f59e0b' : 'var(--text-muted)' }}>
            {starred ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
          </button>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {mat.title}
        </h3>

        {/* Description */}
        {mat.description && (
          <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {mat.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {mat.subject && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
              {mat.subject}
            </span>
          )}
          {mat.semester && (
            <span className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {mat.semester}
            </span>
          )}
          {mat.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              #{tag}
            </span>
          ))}
          {mat.tags.length > 2 && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{mat.tags.length - 2}</span>
          )}
        </div>

        {/* Type badge + date */}
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {mat.type === 'link' ? <Link2 size={10}/> : <Upload size={10}/>}
            {mat.type === 'link' ? 'Link' : mat.file_name ?? 'Arquivo'}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ago}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onOpen}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all hover:bg-[var(--accent-soft)]"
                style={{ color: 'var(--accent-3)' }}>
          {mat.type === 'link' ? <ExternalLink size={12}/> : <Download size={12}/>}
          {mat.type === 'link' ? 'Abrir' : 'Baixar'}
        </button>
        <div className="w-px" style={{ background: 'var(--border)' }} />
        <button onClick={onEdit}
                className="px-3 py-2.5 text-xs transition-all hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-muted)' }}>
          <Pencil size={12} />
        </button>
        <div className="w-px" style={{ background: 'var(--border)' }} />
        <button onClick={onDelete}
                className="px-3 py-2.5 text-xs transition-all hover:bg-red-500/10"
                style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Material List Row ─────────────────────────────────────────────────────────
function MaterialRow({
  mat, starred, onToggleStar, onOpen, onDelete, onEdit,
}: {
  mat: Material
  starred: boolean
  onToggleStar: () => void
  onOpen: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const cat = CATEGORIES.find(c => c.value === mat.category)!
  const ago = formatDistanceToNow(parseISO(mat.created_at), { locale: ptBR, addSuffix: true })

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all animate-in"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Category icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: cat.color + '22', color: cat.color }}>
        {CAT_ICON[mat.category]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{mat.title}</span>
          {mat.is_global && <Globe size={10} style={{ color: '#a855f7' }} />}
          {mat.subject && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
              {mat.subject}
            </span>
          )}
        </div>
        {mat.description && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{mat.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: cat.color + '22', color: cat.color }}>
            {cat.emoji} {cat.label}
          </span>
          {mat.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>#{tag}</span>
          ))}
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>{ago}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggleStar} className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                style={{ color: starred ? '#f59e0b' : 'var(--text-muted)' }}>
          {starred ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
        </button>
        <button onClick={onOpen}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
          {mat.type === 'link' ? <ExternalLink size={12} /> : <Download size={12} />}
        </button>
        <button onClick={onEdit} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-muted)' }}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  mat, globalKey, setGlobalKey, onConfirm, onCancel, loading,
}: {
  mat: Material
  globalKey: string
  setGlobalKey: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Trash2 size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {mat.is_global ? 'Remover material global' : 'Remover material'}
            </h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          "{mat.title}"
        </p>
        {mat.is_global && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
               style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <KeyRound size={14} style={{ color: '#a855f7' }} />
            <input className="input flex-1 text-sm" type="password" placeholder="Chave de acesso global"
                   value={globalKey} onChange={e => setGlobalKey(e.target.value)} />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary py-2 rounded-xl text-sm">Cancelar</button>
          <button onClick={onConfirm} disabled={loading}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#ef4444', color: '#fff' }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MaterialsPage() {
  const [materials,    setMaterials]    = useState<Material[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editingMat,   setEditingMat]   = useState<Material | undefined>()
  const [deletingMat,  setDeletingMat]  = useState<Material | undefined>()
  const [deleteLoading,setDeleteLoading]= useState(false)
  const [globalKey,    setGlobalKey]    = useState('')

  // Filters
  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState<MaterialCategory | 'all'>('all')
  const [filterType,  setFilterType]  = useState<MaterialType | 'all'>('all')
  const [filterScope, setFilterScope] = useState<'all' | 'global' | 'mine'>('all')
  const [filterStarred, setFilterStarred] = useState(false)
  const [filterSubject, setFilterSubject] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Sort & View
  const [sortField,  setSortField]  = useState<SortField>('created_at')
  const [sortAsc,    setSortAsc]    = useState(false)
  const [viewMode,   setViewMode]   = useState<ViewMode>('grid')

  // Starred
  const [starred, setStarred] = useState<Set<string>>(loadStarred)

  // Load materials — try API first, fallback to localStorage
  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Material[]>('/materials')
      const merged = (data ?? []).map(m => ({ ...m, starred: starred.has(m.id) }))
      setMaterials(merged)
      saveLocal(merged)
    } catch (err: any) {
      // Silencioso: usa cache local se disponível, ou lista vazia
      // O toast só aparece em erros HTTP explícitos do servidor
      const cached = loadLocal()
      setMaterials(cached)
      const status = err?.response?.status
      const detail = err?.response?.data?.detail as string | undefined
      if (status === 500 || status === 503) {
        toast.error(detail ?? `Erro no servidor (${status}). Tente recarregar.`)
      } else if (status && status !== 401 && status !== 403 && status !== 404 && detail) {
        toast.error(detail)
      }
      // Sem resposta (rede/proxy) ou 404: silencioso — lista vazia é estado normal
      console.warn('[Materials] API indisponível, usando cache local:', err?.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  // ── Save (create / edit) ──────────────────────────────────────────────────
  const handleSave = async (formData: MaterialFormData, file?: File) => {
    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const headers: Record<string, string> = {}
    if (formData.is_global && globalKey) headers['x-global-key'] = globalKey

    let saved: Material | null = null
    let savedViaApi = false

    // ── Tenta API ──────────────────────────────────────────────────────────
    try {
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        Object.entries({ ...formData, tags: JSON.stringify(tags) }).forEach(([k, v]) => fd.append(k, String(v)))
        if (editingMat) {
          const { data } = await api.put<Material>(`/materials/${editingMat.id}`, fd, {
            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
          })
          saved = data
        } else {
          const { data } = await api.post<Material>('/materials', fd, {
            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
          })
          saved = data
        }
      } else {
        const payload = { ...formData, tags }
        if (editingMat) {
          const { data } = await api.put<Material>(`/materials/${editingMat.id}`, payload, { headers })
          saved = data
        } else {
          const { data } = await api.post<Material>('/materials', payload, { headers })
          saved = data
        }
      }
      savedViaApi = true
    } catch (err: any) {
      // Materiais globais NUNCA devem cair no fallback local —
      // eles precisam do servidor para serem visíveis a outros usuários.
      if (formData.is_global) {
        const msg = err?.response?.data?.detail ?? 'Erro ao salvar material global.'
        toast.error(msg)
        throw err           // propaga para o form mostrar estado de erro
      }

      // Material pessoal: salva localmente como fallback offline
      toast('Servidor indisponível — material salvo localmente.', { icon: '⚠️' })
      saved = {
        id:          editingMat?.id ?? crypto.randomUUID(),
        title:       formData.title,
        description: formData.description || undefined,
        category:    formData.category,
        type:        formData.type,
        url:         formData.type === 'link' ? formData.url : undefined,
        file_name:   file?.name,
        file_size:   file?.size,
        subject:     formData.subject || undefined,
        tags,
        is_global:   false,
        created_at:  editingMat?.created_at ?? new Date().toISOString(),
        semester:    formData.semester || undefined,
      }
    }

    if (!saved) return

    setMaterials(prev => {
      const updated = editingMat
        ? prev.map(m => m.id === editingMat.id ? { ...saved!, starred: m.starred } : m)
        : [{ ...saved!, starred: false }, ...prev]
      saveLocal(updated)
      return updated
    })

    if (!editingMat) addExp(EXP_REWARDS.noteCreated)
    toast.success(
      editingMat
        ? 'Material atualizado!'
        : savedViaApi
          ? 'Material adicionado! 📚'
          : 'Material salvo localmente (offline).'
    )
    setEditingMat(undefined)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingMat) return
    if (deletingMat.is_global && !globalKey) { toast.error('Informe a chave de acesso global'); return }
    setDeleteLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (deletingMat.is_global && globalKey) headers['x-global-key'] = globalKey
      await api.delete(`/materials/${deletingMat.id}`, { headers })

      // Sucesso na API — remove local também
      setMaterials(prev => {
        const updated = prev.filter(m => m.id !== deletingMat.id)
        saveLocal(updated)
        return updated
      })
      setDeletingMat(undefined)
      toast.success('Material removido')
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Erro ao remover material.'
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Star toggle ───────────────────────────────────────────────────────────
  const toggleStar = (id: string) => {
    setStarred(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveStarred(next)
      return next
    })
  }

  // ── Filtered + sorted ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...materials]

    if (filterCat !== 'all')   list = list.filter(m => m.category === filterCat)
    if (filterType !== 'all')  list = list.filter(m => m.type === filterType)
    if (filterScope === 'global') list = list.filter(m => m.is_global)
    if (filterScope === 'mine')   list = list.filter(m => !m.is_global)
    if (filterStarred)            list = list.filter(m => starred.has(m.id))
    if (filterSubject.trim())     list = list.filter(m => m.subject?.toLowerCase().includes(filterSubject.toLowerCase()))

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.subject?.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    list.sort((a, b) => {
      let av: string, bv: string
      if (sortField === 'title')      { av = a.title;       bv = b.title }
      else if (sortField === 'category') { av = a.category; bv = b.category }
      else if (sortField === 'subject')  { av = a.subject ?? ''; bv = b.subject ?? '' }
      else                               { av = a.created_at;   bv = b.created_at }
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    // Starred first
    list.sort((a, b) => {
      const as = starred.has(a.id) ? 0 : 1
      const bs = starred.has(b.id) ? 0 : 1
      return as - bs
    })

    return list
  }, [materials, filterCat, filterType, filterScope, filterStarred, filterSubject, search, sortField, sortAsc, starred])

  // Unique subjects for autocomplete
  const subjects = useMemo(() =>
    [...new Set(materials.map(m => m.subject).filter(Boolean) as string[])].sort(),
    [materials]
  )

  const activeFilterCount = [
    filterCat !== 'all', filterType !== 'all',
    filterScope !== 'all', filterStarred, filterSubject.trim().length > 0,
  ].filter(Boolean).length

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: materials.length,
    global: materials.filter(m => m.is_global).length,
    starred: [...starred].filter(id => materials.some(m => m.id === id)).length,
    byCat: CATEGORIES.map(c => ({ ...c, count: materials.filter(m => m.category === c.value).length })),
  }), [materials, starred])

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto space-y-5">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📚</span>
            Materiais
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {materials.length} {materials.length === 1 ? 'material' : 'materiais'} de estudo
          </p>
        </div>
        <button
          onClick={() => { setEditingMat(undefined); setShowForm(true) }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.byCat.filter(c => c.count > 0).slice(0, 4).map(c => (
          <button key={c.value}
                  onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: filterCat === c.value ? c.color + '22' : 'var(--bg-card)',
                    border: `1px solid ${filterCat === c.value ? c.color : 'var(--border)'}`,
                  }}>
            <span className="text-xl">{c.emoji}</span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{c.count}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Search + Filters bar ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input w-full pl-9 pr-3 py-2.5 text-sm"
              placeholder="Buscar por título, disciplina, tag..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(f => !f)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: showFilters || activeFilterCount > 0 ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--accent-1)' : 'var(--border)'}`,
                    color: showFilters || activeFilterCount > 0 ? 'var(--accent-3)' : 'var(--text-secondary)',
                  }}>
            <Filter size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--accent-3)', color: '#fff' }}>
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <select
              className="text-sm bg-transparent outline-none cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              value={sortField} onChange={e => setSortField(e.target.value as SortField)}>
              <option value="created_at">Data</option>
              <option value="title">Título</option>
              <option value="category">Categoria</option>
              <option value="subject">Disciplina</option>
            </select>
            <button onClick={() => setSortAsc(a => !a)} style={{ color: 'var(--text-muted)' }}>
              {sortAsc ? <SortAsc size={14}/> : <SortDesc size={14}/>}
            </button>
          </div>

          {/* View mode */}
          <div className="hidden sm:flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['grid', 'list'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                      className="px-3 py-2.5 transition-all"
                      style={{ background: viewMode === v ? 'var(--accent-soft)' : 'var(--bg-card)', color: viewMode === v ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                {v === 'grid' ? <Grid2X2 size={14}/> : <List size={14}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="p-4 rounded-2xl space-y-4 animate-in"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Category */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Categoria</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterCat('all')}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          background: filterCat === 'all' ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          border: `1px solid ${filterCat === 'all' ? 'var(--accent-1)' : 'var(--border)'}`,
                          color: filterCat === 'all' ? 'var(--accent-3)' : 'var(--text-muted)',
                        }}>
                  Todas
                </button>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
                          className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: filterCat === c.value ? c.color + '22' : 'var(--bg-elevated)',
                            border: `1.5px solid ${filterCat === c.value ? c.color : 'var(--border)'}`,
                            color: filterCat === c.value ? c.color : 'var(--text-muted)',
                          }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Type */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Tipo</p>
                <div className="flex gap-1.5">
                  {(['all', 'link', 'file'] as const).map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                            className="flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{
                              background: filterType === t ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                              border: `1px solid ${filterType === t ? 'var(--accent-1)' : 'var(--border)'}`,
                              color: filterType === t ? 'var(--accent-3)' : 'var(--text-muted)',
                            }}>
                      {t === 'all' ? 'Todos' : t === 'link' ? '🔗 Link' : '📁 Arquivo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Visibilidade</p>
                <div className="flex gap-1.5">
                  {(['all', 'global', 'mine'] as const).map(s => (
                    <button key={s} onClick={() => setFilterScope(s)}
                            className="flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{
                              background: filterScope === s ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                              border: `1px solid ${filterScope === s ? 'var(--accent-1)' : 'var(--border)'}`,
                              color: filterScope === s ? 'var(--accent-3)' : 'var(--text-muted)',
                            }}>
                      {s === 'all' ? 'Todos' : s === 'global' ? '🌐 Global' : '👤 Meus'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Disciplina</p>
                <div className="relative">
                  <input className="input w-full text-xs py-1.5 pr-3 pl-2.5"
                         placeholder="Filtrar por disciplina..."
                         value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                         list="subjects-list" />
                  <datalist id="subjects-list">
                    {subjects.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Starred */}
            <div className="flex items-center justify-between">
              <button onClick={() => setFilterStarred(f => !f)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: filterStarred ? 'rgba(245,158,11,0.12)' : 'var(--bg-elevated)',
                        border: `1px solid ${filterStarred ? '#f59e0b' : 'var(--border)'}`,
                        color: filterStarred ? '#f59e0b' : 'var(--text-muted)',
                      }}>
                <Star size={12} fill={filterStarred ? 'currentColor' : 'none'} />
                Apenas favoritos
              </button>

              {activeFilterCount > 0 && (
                <button onClick={() => {
                  setFilterCat('all'); setFilterType('all'); setFilterScope('all')
                  setFilterStarred(false); setFilterSubject(''); setSearch('')
                }}
                        className="text-xs px-3 py-1.5 rounded-xl transition-all"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Results count ──────────────────────────────────────────────────── */}
      {(search || activeFilterCount > 0) && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          {search && <> para "<span style={{ color: 'var(--text-primary)' }}>{search}</span>"</>}
        </p>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-3)' }} />
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: 'var(--bg-elevated)' }}>
            <BookOpen size={24} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            {materials.length === 0 ? 'Nenhum material ainda' : 'Nenhum resultado encontrado'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {materials.length === 0
              ? 'Adicione o primeiro material de estudo do curso'
              : 'Tente ajustar os filtros ou o termo de busca'}
          </p>
          {materials.length === 0 && (
            <button
              onClick={() => { setEditingMat(undefined); setShowForm(true) }}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
              <Plus size={14} /> Adicionar material
            </button>
          )}
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(mat => (
            <MaterialCard
              key={mat.id}
              mat={mat}
              starred={starred.has(mat.id)}
              onToggleStar={() => toggleStar(mat.id)}
              onOpen={() => {
                const url = mat.url ?? mat.file_url
                if (url) window.open(url, '_blank')
                else toast.error('Arquivo não disponível para visualização online')
              }}
              onEdit={() => { setEditingMat(mat); setShowForm(true) }}
              onDelete={() => setDeletingMat(mat)}
            />
          ))}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.map(mat => (
            <MaterialRow
              key={mat.id}
              mat={mat}
              starred={starred.has(mat.id)}
              onToggleStar={() => toggleStar(mat.id)}
              onOpen={() => {
                const url = mat.url ?? mat.file_url
                if (url) window.open(url, '_blank')
                else toast.error('Arquivo não disponível para visualização online')
              }}
              onEdit={() => { setEditingMat(mat); setShowForm(true) }}
              onDelete={() => setDeletingMat(mat)}
            />
          ))}
        </div>
      )}

      {/* ── Form modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <MaterialForm
          onClose={() => { setShowForm(false); setEditingMat(undefined) }}
          onSave={handleSave}
          editing={editingMat}
          globalKey={globalKey}
          setGlobalKey={setGlobalKey}
        />
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deletingMat && (
        <DeleteConfirm
          mat={deletingMat}
          globalKey={globalKey}
          setGlobalKey={setGlobalKey}
          onConfirm={handleDelete}
          onCancel={() => setDeletingMat(undefined)}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
