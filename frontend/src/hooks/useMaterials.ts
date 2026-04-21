// ── Materials hook — server state, CRUD, starred ─────────────────────────────
import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaterialCategory =
  | 'aula' | 'exercicio' | 'livro' | 'video' | 'artigo' | 'podcast' | 'outro'

export type MaterialType = 'link' | 'file'

/** Raw shape returned by the API (tags may come in several formats). */
export interface Material {
  id: string
  title: string
  description?: string | null
  category: MaterialCategory
  type: MaterialType
  url?: string | null
  file_url?: string | null
  file_name?: string | null
  subject?: string | null
  /** tags pode vir como array, string JSON, string "{a,b}" (formato Postgres) ou null/undefined */
  tags: string[] | string | null | undefined
  is_global: boolean
  created_at: string
  created_by?: string | null
  semester?: string | null
}

/** Normalised version used internally — tags always string[]. */
export interface NormalizedMaterial extends Omit<Material, 'tags'> {
  tags: string[]
}

/** Form payload sent to the API. */
export interface MaterialFormData {
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

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Normalises tags regardless of format coming from the API:
 *  - string[]           → returned as-is (filtered)
 *  - string "{a,b,c}"  → Postgres array literal
 *  - string "a,b,c"    → comma-separated
 *  - null/undefined     → []
 */
export function parseTags(raw: string[] | string | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  const s = String(raw).trim()
  if (!s || s === '{}') return []
  if (s.startsWith('{') && s.endsWith('}')) {
    return s.slice(1, -1).split(',').map(t => t.trim().replace(/^"|"$/g, '')).filter(Boolean)
  }
  return s.split(',').map(t => t.trim()).filter(Boolean)
}

/** Normalises a raw API material, ensuring every field is safe to access. */
export function normalizeMaterial(m: Material): NormalizedMaterial {
  return {
    ...m,
    title:       m.title       ?? '',
    description: m.description ?? null,
    category:    (m.category   ?? 'outro') as MaterialCategory,
    type:        (m.type       ?? 'link')  as MaterialType,
    url:         m.url         ?? null,
    file_url:    m.file_url    ?? null,
    file_name:   m.file_name   ?? null,
    subject:     m.subject     ?? null,
    semester:    m.semester    ?? null,
    is_global:   Boolean(m.is_global),
    created_at:  m.created_at  ?? new Date().toISOString(),
    tags:        parseTags(m.tags),
  }
}

/** Formats a date as a relative string (e.g. "há 2 dias"). Never throws. */
export function safeFormatAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return ''
    return formatDistanceToNow(date, { locale: ptBR, addSuffix: true })
  } catch {
    return ''
  }
}

/** Case-insensitive locale compare that treats null/undefined as empty string. */
export function safeCmp(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'pt-BR', { sensitivity: 'base' })
}

/** Human-readable file size. */
export function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Starred persistence helpers ───────────────────────────────────────────────

function loadStarred(): Set<string> {
  return new Set(storage.get<string[]>(STORAGE_KEYS.materialsStarred, []))
}

function saveStarred(ids: Set<string>): void {
  storage.set(STORAGE_KEYS.materialsStarred, [...ids])
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useMaterials — owns all server state and CRUD operations for the materials
 * page.  The UI concerns (filter state, modal visibility, sort/view mode) are
 * intentionally left in the page component so this hook stays focused.
 */
export function useMaterials() {
  const [materials,     setMaterials]     = useState<NormalizedMaterial[]>([])
  const [loading,       setLoading]       = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [starred,       setStarred]       = useState<Set<string>>(loadStarred)
  const [globalKey,     setGlobalKey]     = useState('')

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Material[]>('/materials')
      const normalized = (Array.isArray(data) ? data : []).map(normalizeMaterial)
      setMaterials(normalized)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      const status  = e?.response?.status
      const detail  = e?.response?.data?.detail
      const hasResp = Boolean(e?.response)

      if (status === 401 || status === 403) {
        // auth interceptor already handles redirect
      } else if (status === 404) {
        toast.error('Rota /materials não encontrada. Verifique o deploy do backend.')
      } else if (status === 503) {
        toast.error(detail ?? 'Tabelas de materiais não inicializadas. Reinicie o backend.')
      } else if (hasResp) {
        toast.error(detail ?? `Erro ${status} no servidor.`)
      } else {
        toast('Servidor indisponível. Verifique sua conexão.', { icon: '📡', duration: 4000 })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  // ── Save ──────────────────────────────────────────────────────────────────

  /**
   * Creates or updates a material.
   *
   * @param editingId  Pass the existing material's ID to update it, or
   *                   `undefined` to create a new one.
   *
   * Throws on network/server failure (errors are also shown via toast so the
   * caller only needs to handle re-throw propagation, not messaging).
   */
  const saveMaterial = useCallback(async (
    formData: MaterialFormData,
    file: File | undefined,
    editingId: string | undefined,
  ) => {
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    const headers: Record<string, string> = {}
    if (formData.is_global && globalKey) headers['x-global-key'] = globalKey

    const payload = {
      title:       formData.title,
      description: formData.description || null,
      category:    formData.category,
      type:        formData.type,
      url:         formData.type === 'link' ? formData.url : null,
      subject:     formData.subject || null,
      tags,
      is_global:   formData.is_global,
      semester:    formData.semester || null,
    }

    // Step 1: create / update metadata
    let saved: NormalizedMaterial
    try {
      if (editingId) {
        const { data } = await api.put<Material>(`/materials/${editingId}`, payload, { headers })
        saved = normalizeMaterial(data)
      } else {
        const { data } = await api.post<Material>('/materials/', payload, { headers })
        saved = normalizeMaterial(data)
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      const detail = e?.response?.data?.detail
      const status = e?.response?.status
      toast.error(detail ?? (status ? `Erro ${status} ao salvar material.` : 'Erro ao salvar material.'))
      throw err
    }

    // Step 2: upload file (if provided)
    if (formData.type === 'file' && file) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const { data } = await api.post<Material>(`/materials/${saved.id}/upload`, fd, { headers })
        saved = normalizeMaterial(data)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string } } }
        const msg = e?.response?.data?.detail
          ?? 'Erro ao enviar arquivo. Tente editar o material para reenviar.'
        toast.error(msg)
        // Keep the metadata record even when the upload fails
        setMaterials(prev =>
          editingId
            ? prev.map(m => m.id === editingId ? saved : m)
            : [saved, ...prev]
        )
        throw err
      }
    }

    setMaterials(prev =>
      editingId
        ? prev.map(m => m.id === editingId ? saved : m)
        : [saved, ...prev]
    )

    if (!editingId) addExp(EXP_REWARDS.noteCreated)
    toast.success(editingId ? 'Material atualizado!' : 'Material adicionado! 📚')
  }, [globalKey])

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * Deletes a material.
   *
   * @returns `true` on success, `false` if local validation failed (e.g.
   * missing global key).  Network errors are toasted and also return `false`.
   */
  const deleteMaterial = useCallback(async (mat: NormalizedMaterial): Promise<boolean> => {
    if (mat.is_global && !globalKey) {
      toast.error('Informe a chave de acesso global')
      return false
    }
    setDeleteLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (mat.is_global && globalKey) headers['x-global-key'] = globalKey
      await api.delete(`/materials/${mat.id}`, { headers })
      setMaterials(prev => prev.filter(m => m.id !== mat.id))
      toast.success('Material removido')
      return true
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e?.response?.data?.detail ?? 'Erro ao remover material.')
      return false
    } finally {
      setDeleteLoading(false)
    }
  }, [globalKey])

  // ── Starred ───────────────────────────────────────────────────────────────

  const toggleStar = useCallback((id: string) => {
    setStarred(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveStarred(next)
      return next
    })
  }, [])

  // ── Open / download ───────────────────────────────────────────────────────

  const openMaterial = useCallback((mat: NormalizedMaterial) => {
    const url = mat.url ?? mat.file_url
    if (!url) { toast.error('Arquivo não disponível'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  return {
    materials,
    loading,
    deleteLoading,
    starred,
    globalKey,
    setGlobalKey,
    fetchMaterials,
    saveMaterial,
    deleteMaterial,
    toggleStar,
    openMaterial,
  }
}
