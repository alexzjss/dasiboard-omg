// ── Quick Notes Editor — per subject, with markdown preview + flashcard gen ────
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  FileText, Plus, Trash2, X, Save, Eye, Edit3,
  Zap, ChevronDown, ChevronRight, Clock,
} from 'lucide-react'
import { useNotes, generateFlashcards, Note } from '@/hooks/useNotes'
import { recordStudyEvent } from '@/hooks/useStudyStats'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Minimal markdown renderer ─────────────────────────────────────────────────
function renderMd(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // headings
    .replace(/^### (.+)$/gm, '<h3 style="font-size:0.85em;font-weight:700;margin:0.75em 0 0.25em;color:var(--accent-3)">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:0.95em;font-weight:800;margin:0.75em 0 0.25em;color:var(--text-primary)">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:1.1em;font-weight:800;margin:0.5em 0 0.25em;color:var(--text-primary)">$1</h1>')
    // bold/italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/_(.+?)_/g,       '<em>$1</em>')
    // inline code
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-elevated);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
    // Q/A highlight
    .replace(/^([Qq][:：]\s*)(.+)$/gm, '<span style="color:var(--accent-3);font-weight:600">$1</span><span>$2</span>')
    .replace(/^([Aa][:：]\s*)(.+)$/gm, '<span style="color:#22c55e;font-weight:600">$1</span><span>$2</span>')
    // dash definition
    .replace(/^(\*\*[^*]+\*\*)\s*[—–-]\s*(.+)$/gm, '$1 <span style="color:var(--text-muted)">—</span> $2')
    // lists
    .replace(/^[-*] (.+)$/gm, '<li style="margin:2px 0;padding-left:4px">$1</li>')
    // paragraphs
    .replace(/\n\n/g, '</p><p style="margin:0.4em 0">')
    .replace(/\n/g, '<br/>')
}

// ── Single note editor ────────────────────────────────────────────────────────
function NoteEditor({
  note, onSave, onDelete, onClose,
}: {
  note: Note | null
  onSave: (draft: Omit<Note, 'id' | 'updatedAt'> & { id?: string }) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [content, setContent]   = useState(note?.content ?? '')
  const [preview, setPreview]   = useState(false)
  const [dirty, setDirty]       = useState(false)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)
  const flashcards = note ? generateFlashcards({ ...note, content }) : []

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleSave = () => {
    onSave({ id: note?.id, subjectId: note?.subjectId, eventId: note?.eventId, title: note?.title ?? 'Nota', content })
    if (!note?.id) recordStudyEvent({ type: 'note_created' })
    setDirty(false)
  }

  const insertSnippet = (snippet: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const next = content.slice(0, start) + snippet + content.slice(end)
    setContent(next)
    setDirty(true)
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + snippet.length; ta.focus() }, 0)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <button type="button" onClick={() => insertSnippet('## ')} className="px-2 py-1 rounded text-xs font-mono transition-colors hover:opacity-80" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>H2</button>
        <button type="button" onClick={() => insertSnippet('**')} className="px-2 py-1 rounded text-xs font-bold transition-colors hover:opacity-80" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>B</button>
        <button type="button" onClick={() => insertSnippet('`')} className="px-2 py-1 rounded text-xs font-mono transition-colors hover:opacity-80" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>`</button>
        <button type="button" onClick={() => insertSnippet('- ')} className="px-2 py-1 rounded text-xs transition-colors hover:opacity-80" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>• Lista</button>
        <button type="button" onClick={() => insertSnippet('Q: \nA: ')} className="px-2 py-1 rounded text-xs font-semibold transition-colors hover:opacity-80" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>Q/A</button>
        <button type="button" onClick={() => insertSnippet('**Termo** — Definição')} className="px-2 py-1 rounded text-xs transition-colors hover:opacity-80" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>Def</button>

        <div className="flex-1" />

        {flashcards.length > 0 && (
          <span className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
            <Zap size={9} /> {flashcards.length} flashcards
          </span>
        )}

        <button type="button" onClick={() => setPreview(v => !v)} className="p-1.5 rounded-lg transition-all hover:opacity-80" style={{ background: preview ? 'var(--accent-soft)' : 'var(--bg-card)', color: preview ? 'var(--accent-3)' : 'var(--text-muted)', border: '1px solid var(--border)' }} title={preview ? 'Editar' : 'Preview'}>
          {preview ? <Edit3 size={13} /> : <Eye size={13} />}
        </button>
        <button type="button" onClick={handleSave} disabled={!dirty} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40" style={{ background: dirty ? 'var(--gradient-btn)' : 'var(--bg-elevated)', color: dirty ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <Save size={11} /> Salvar
        </button>
        {note?.id && (
          <button type="button" onClick={() => { onDelete(note.id); onClose() }} className="p-1.5 rounded-lg transition-all hover:opacity-80" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }} title="Excluir nota">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        {preview ? (
          <div
            className="h-full overflow-y-auto p-4 text-sm leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: `<p style="margin:0">${renderMd(content)}</p>` }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); setDirty(true) }}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() } }}
            className="w-full h-full resize-none p-4 text-sm font-mono leading-relaxed outline-none"
            style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: 'none', lineHeight: 1.7 }}
            placeholder={'# Título da nota\n\nEscreva aqui... Use Q: / A: para gerar flashcards automaticamente.\n\nExemplos:\nQ: O que é polimorfismo?\nA: A capacidade de um objeto assumir várias formas.\n\n**Ponteiro** — Variável que armazena o endereço de memória.'}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}

// ── Notes panel (used inside GradesPage per subject) ──────────────────────────
export function NotesPanel({ subjectId, subjectName, onFlashcards }: {
  subjectId: string
  subjectName: string
  onFlashcards?: (cards: ReturnType<typeof generateFlashcards>) => void
}) {
  const { notes, upsertNote, deleteNote, getNotesForSubject, getAllFlashcards } = useNotes()
  const subjectNotes = getNotesForSubject(subjectId)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(subjectNotes[0]?.id ?? null)
  const [expanded, setExpanded]         = useState(false)
  const activeNote = activeNoteId ? subjectNotes.find(n => n.id === activeNoteId) ?? null : null

  const createNote = () => {
    const id = crypto.randomUUID()
    upsertNote({ id, subjectId, title: `Nota ${subjectNotes.length + 1}`, content: '' })
    setActiveNoteId(id)
    setExpanded(true)
  }

  const flashcards = getAllFlashcards(subjectId)

  return (
    <div className="mt-2">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <FileText size={12} />
        <span>Notas rápidas</span>
        <span className="ml-auto flex items-center gap-2">
          {subjectNotes.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>{subjectNotes.length} nota{subjectNotes.length !== 1 ? 's' : ''}</span>
          )}
          {flashcards.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              <Zap size={9} /> {flashcards.length}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {/* Note tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {subjectNotes.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActiveNoteId(n.id)}
                className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeNoteId === n.id ? 'var(--bg-card)' : 'transparent',
                  color: activeNoteId === n.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `1px solid ${activeNoteId === n.id ? 'var(--border-light)' : 'transparent'}`,
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {n.title || 'Sem título'}
              </button>
            ))}
            <button type="button" onClick={createNote} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }} title="Nova nota">
              <Plus size={13} />
            </button>
            {flashcards.length > 0 && onFlashcards && (
              <button type="button" onClick={() => onFlashcards(flashcards)} className="shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white' }}>
                <Zap size={11} /> Revisar ({flashcards.length})
              </button>
            )}
          </div>

          {/* Editor area */}
          <div style={{ height: 260 }}>
            {activeNote !== undefined ? (
              <NoteEditor
                note={activeNote}
                onSave={upsertNote}
                onDelete={deleteNote}
                onClose={() => setActiveNoteId(subjectNotes[0]?.id ?? null)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
                <FileText size={28} className="opacity-30" />
                <p className="text-sm">Nenhuma nota ainda</p>
                <button type="button" onClick={createNote} className="btn-primary text-xs py-1.5 px-4 gap-1.5">
                  <Plus size={12} /> Criar nota
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
