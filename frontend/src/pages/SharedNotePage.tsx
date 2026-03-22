// ── Nota Compartilhada — /notes/shared/[token] (pública, sem login) ──────────
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Share2, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/utils/api'
import { MiniMarkdown } from '@/components/MiniMarkdown'

interface SharedNote {
  id: string; title: string; content: string
  subject_id?: string; updated_at: string
  author_name: string; author_nusp?: string
}

export default function SharedNotePage() {
  const { token } = useParams<{ token: string }>()
  const [note, setNote]     = useState<SharedNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    // Public endpoint — no auth header needed, but axios still sends it if present
    api.get(`/social/shared-note/${token}`)
      .then(({ data }) => setNote(data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [token])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    import('react-hot-toast').then(({ default: toast }) => toast.success('Link copiado!'))
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-in">
      <div className="skeleton h-12 w-64 rounded-xl" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  )

  if (notFound || !note) return (
    <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <FileText size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
      <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Nota não encontrada
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Este link pode ter expirado ou a nota foi tornada privada.
      </p>
      <Link to="/" className="btn-primary text-sm gap-2">
        <ArrowLeft size={14} /> Ir para o DaSIboard
      </Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-mobile animate-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <Link to="/" className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={13} /> DaSIboard
        </Link>
        <button onClick={copyLink} className="btn-ghost text-xs gap-1.5 py-1.5 px-3">
          <Share2 size={12} /> Copiar link
        </button>
      </div>

      {/* Note card */}
      <div className="card space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
              <FileText size={14} style={{ color: 'var(--accent-3)' }} />
            </div>
            {note.subject_id && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--accent-3)', border: '1px solid var(--border)' }}>
                {note.subject_id}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {note.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              por <strong style={{ color: 'var(--text-secondary)' }}>{note.author_name}</strong>
              {note.author_nusp && (
                <> · <Link to={`/u/${note.author_nusp}`}
                            className="inline-flex items-center gap-0.5 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--accent-3)' }}>
                  Nº USP {note.author_nusp} <ExternalLink size={9} />
                </Link></>
              )}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {format(parseISO(note.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'var(--border)' }} />

        {/* Content */}
        <div className="prose-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <MiniMarkdown text={note.content} />
        </div>
      </div>

      <p className="text-center text-xs mt-6 pb-8" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        Nota pública compartilhada via DaSIboard · SI · EACH · USP
      </p>
    </div>
  )
}
