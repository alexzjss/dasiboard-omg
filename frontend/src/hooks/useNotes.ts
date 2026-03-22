// ── Quick Notes — per subject + per event, markdown-lite, with flashcard gen ──
import { useState, useCallback } from 'react'

export interface Note {
  id: string
  subjectId?: string   // discipline code or ID
  eventId?: string     // event ID
  title: string        // inferred from first heading or subject name
  content: string      // markdown-lite text
  updatedAt: string
}

export interface Flashcard {
  id: string
  front: string
  back: string
  noteId: string
  subjectId?: string
}

const NOTES_KEY     = 'dasiboard-notes'
const REVIEWED_KEY  = 'dasiboard-flashcard-review'

// ── Persistence helpers ────────────────────────────────────────────────────────
function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]') } catch { return [] }
}
function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

// ── Flashcard generation from markdown-lite ────────────────────────────────────
// Parses Q/A patterns:
//   - "Q: ... A: ..."
//   - "Pergunta: ... Resposta: ..."
//   - "## Heading" → heading is front, next paragraph is back
//   - "**term** — definition"   (bold term dash definition)
export function generateFlashcards(note: Note): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = note.content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Q: ... A: ... (same line or next line)
    const qMatch = line.match(/^[Qq](?:uestion|uergunta|:)\s*:?\s*(.+)/)
    if (qMatch) {
      const front = qMatch[1].trim()
      let back = ''
      // Check next lines for A:
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const aMatch = lines[j].trim().match(/^[Aa](?:nswer|nswer|esposta|:)\s*:?\s*(.+)/)
        if (aMatch) { back = aMatch[1].trim(); i = j; break }
      }
      if (front && back) {
        cards.push({ id: `${note.id}-${cards.length}`, front, back, noteId: note.id, subjectId: note.subjectId })
      }
      i++
      continue
    }

    // ## Heading → next non-empty paragraph
    const headMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headMatch) {
      const front = headMatch[1].trim()
      let back = ''
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const bl = lines[j].trim()
        if (bl && !bl.startsWith('#')) { back = bl.replace(/\*\*/g, '').replace(/__/g, ''); break }
      }
      if (front && back) {
        cards.push({ id: `${note.id}-${cards.length}`, front, back, noteId: note.id, subjectId: note.subjectId })
      }
      i++
      continue
    }

    // **term** — definition
    const boldMatch = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)/)
    if (boldMatch) {
      cards.push({
        id: `${note.id}-${cards.length}`,
        front: boldMatch[1].trim(),
        back: boldMatch[2].trim(),
        noteId: note.id,
        subjectId: note.subjectId,
      })
    }

    i++
  }

  return cards
}

// ── React hook ─────────────────────────────────────────────────────────────────
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)

  const upsertNote = useCallback((draft: Omit<Note, 'id' | 'updatedAt'> & { id?: string }) => {
    setNotes(prev => {
      const now = new Date().toISOString()
      const existing = draft.id ? prev.find(n => n.id === draft.id) : undefined
      let next: Note[]
      if (existing) {
        next = prev.map(n => n.id === draft.id ? { ...n, ...draft, updatedAt: now } as Note : n)
      } else {
        const newNote: Note = {
          ...draft,
          id: draft.id ?? crypto.randomUUID(),
          updatedAt: now,
        }
        next = [newNote, ...prev]
      }
      saveNotes(next)
      return next
    })
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      saveNotes(next)
      return next
    })
  }, [])

  const getNotesForSubject = useCallback(
    (subjectId: string) => notes.filter(n => n.subjectId === subjectId),
    [notes]
  )

  const getAllFlashcards = useCallback(
    (subjectId?: string) => {
      const targetNotes = subjectId ? notes.filter(n => n.subjectId === subjectId) : notes
      return targetNotes.flatMap(generateFlashcards)
    },
    [notes]
  )

  return { notes, upsertNote, deleteNote, getNotesForSubject, getAllFlashcards }
}

// ── Flashcard review session state ────────────────────────────────────────────
interface ReviewProgress {
  correct: string[]   // flashcard IDs answered correctly this session
  wrong: string[]
}
export function createReviewSession(cards: Flashcard[]): Flashcard[] {
  // Shuffle
  return [...cards].sort(() => Math.random() - 0.5)
}
