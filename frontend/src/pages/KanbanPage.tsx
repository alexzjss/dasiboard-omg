import { useEffect, useState, useRef, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, rectIntersection,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Trash2, GripVertical, AlertCircle, Clock, ChevronDown,
  Calendar, Flag, Edit2, X, Check,
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

interface Card {
  id: string; title: string; description?: string
  priority: string; due_date?: string; position: number; column_id: string
  created_at: string
}
interface Column { id: string; title: string; position: number; cards: Card[] }
interface Board  { id: string; title: string; color: string; columns: Column[] }

const PRIORITY = {
  high:   { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' },
  medium: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  low:    { label: 'Baixa', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  dot: '#22c55e' },
} as const

const COL_STYLES: Record<number, { accent: string; bg: string; header: string }> = {
  0: { accent: '#64748b', bg: 'rgba(100,116,139,0.06)', header: 'rgba(100,116,139,0.15)' },
  1: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  header: 'rgba(245,158,11,0.15)'  },
  2: { accent: '#22c55e', bg: 'rgba(34,197,94,0.06)',   header: 'rgba(34,197,94,0.15)'   },
}

// ── Card Modal ────────────────────────────────────────────
function CardModal({
  card, onClose, onSave, onDelete,
}: {
  card: Card | null; onClose: () => void
  onSave: (cardId: string, data: Partial<Card>) => Promise<void>
  onDelete: (cardId: string) => Promise<void>
}) {
  const [title, setTitle] = useState(card?.title ?? '')
  const [desc, setDesc]   = useState(card?.description ?? '')
  const [priority, setPri] = useState(card?.priority ?? 'medium')
  const [due, setDue]     = useState(card?.due_date ? card.due_date.slice(0, 16) : '')
  const [saving, setSaving] = useState(false)

  if (!card) return null

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave(card.id, { title: title.trim(), description: desc || undefined, priority, due_date: due || undefined })
    setSaving(false)
    onClose()
  }

  const prioConfig = PRIORITY[priority as keyof typeof PRIORITY] ?? PRIORITY.medium

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-in space-y-4 overflow-y-auto" style={{maxHeight:"90dvh",background:"var(--bg-card)",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Editar card
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="label">Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} />
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea className="input resize-none h-20 text-sm" placeholder="Adicionar descrição…"
                    value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prioridade</label>
            <div className="flex gap-2">
              {Object.entries(PRIORITY).map(([k, v]) => (
                <button key={k} onClick={() => setPri(k)}
                        className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: priority === k ? v.bg : 'var(--bg-elevated)',
                          color: priority === k ? v.color : 'var(--text-muted)',
                          border: `1px solid ${priority === k ? v.color + '44' : 'var(--border)'}`,
                          transform: priority === k ? 'scale(1.04)' : 'scale(1)',
                        }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Data limite</label>
            <input type="datetime-local" className="input text-sm" value={due}
                   onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
            <Check size={15} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button className="btn-danger" onClick={() => { onDelete(card.id); onClose() }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sortable Card ─────────────────────────────────────────
function KanbanCard({ card, colAccent, onEdit }: {
  card: Card; colAccent: string; onEdit: (c: Card) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: 'card', card } })

  const prioConfig = PRIORITY[card.priority as keyof typeof PRIORITY] ?? PRIORITY.medium
  const dueDate = card.due_date ? new Date(card.due_date) : null
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate)
  const isDueToday = dueDate && isToday(dueDate)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        pointerEvents: isDragging ? 'none' : undefined,
      }}
    >
      <div
        className="rounded-xl p-3 group cursor-default transition-all"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = colAccent + '66' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
      >
        {/* Priority bar */}
        <div className="w-full h-0.5 rounded-full mb-2.5" style={{ background: prioConfig.bg }}>
          <div className="h-full rounded-full w-full" style={{ background: prioConfig.color, opacity: 0.5 }} />
        </div>

        <div className="flex items-start gap-2">
          <button
            {...attributes} {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
            style={{ color: 'var(--text-muted)', touchAction: 'none' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = colAccent)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <GripVertical size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
              {card.title}
            </p>
            {card.description && (
              <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                {card.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: prioConfig.bg, color: prioConfig.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: prioConfig.color }} />
                {prioConfig.label}
              </span>
              {dueDate && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isOverdue ? 'rgba(239,68,68,0.12)' : isDueToday ? 'rgba(245,158,11,0.12)' : 'var(--bg-surface)',
                        color: isOverdue ? '#f87171' : isDueToday ? '#f59e0b' : 'var(--text-muted)',
                      }}>
                  <Clock size={9} />
                  {format(dueDate, 'd MMM', { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onEdit(card)}
            className="opacity-0 group-hover:opacity-100 transition-all mt-0.5 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = colAccent)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <Edit2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Droppable Column ──────────────────────────────────────
function KanbanColumn({
  column, onAddCard, onEditCard, isOver, activeId,
}: {
  column: Column
  onAddCard: (colId: string, data: { title: string; description?: string; priority: string; due_date?: string }) => void
  onEditCard: (c: Card) => void
  isOver: boolean
  activeId: string | null
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const [newPri, setNewPri]     = useState('medium')
  const [newDue, setNewDue]     = useState('')

  const idx = column.position % 3
  const style = COL_STYLES[idx] ?? COL_STYLES[0]

  const { setNodeRef: setDropRef } = useDroppable({ id: column.id, data: { type: 'column' } })

  const submit = () => {
    if (!newTitle.trim()) return
    onAddCard(column.id, {
      title: newTitle.trim(),
      description: newDesc || undefined,
      priority: newPri,
      due_date: newDue || undefined,
    })
    setNewTitle(''); setNewDesc(''); setNewPri('medium'); setNewDue(''); setAdding(false)
  }

  const draggingIntoEmpty = isOver && column.cards.filter(c => c.id !== activeId).length === 0

  return (
    <div
      className="shrink-0 flex flex-col rounded-2xl transition-all"
      style={{width:"min(288px,80vw)",
        background: isOver ? style.bg : 'var(--bg-surface)',
        border: `1px solid ${isOver ? style.accent + '66' : 'var(--border)'}`,
        boxShadow: isOver ? `0 0 0 2px ${style.accent}33, 0 4px 24px ${style.accent}11` : 'none',
      }}
    >
      {/* Column header */}
      <div className="px-4 py-3 rounded-t-2xl flex items-center justify-between"
           style={{ background: style.header, borderBottom: `1px solid ${style.accent}22` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: style.accent }} />
          <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {column.title}
          </h3>
        </div>
        <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
              style={{ background: style.accent + '22', color: style.accent }}>
          {column.cards.length}
        </span>
      </div>

      {/* Cards area */}
      <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setDropRef} className="flex-1 p-3 space-y-2 min-h-[80px]">
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} colAccent={style.accent} onEdit={onEditCard} />
          ))}
          {draggingIntoEmpty && (
            <div className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-xs animate-pulse"
                 style={{ borderColor: style.accent, color: style.accent, background: style.bg }}>
              Soltar aqui
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add card */}
      <div className="p-3 pt-0">
        {adding ? (
          <div className="rounded-xl p-3 space-y-2 animate-in"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <input autoFocus className="input text-sm py-2"
                   placeholder="Título do card…" value={newTitle}
                   onChange={(e) => setNewTitle(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} />
            <textarea className="input text-sm resize-none h-14 py-2" placeholder="Descrição (opcional)…"
                      value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <div className="flex gap-1">
              {Object.entries(PRIORITY).map(([k, v]) => (
                <button key={k} onClick={() => setNewPri(k)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                        style={{
                          background: newPri === k ? v.bg : 'transparent',
                          color: newPri === k ? v.color : 'var(--text-muted)',
                          border: `1px solid ${newPri === k ? v.color + '44' : 'var(--border)'}`,
                        }}>
                  {v.label}
                </button>
              ))}
            </div>
            <input type="datetime-local" className="input text-xs py-1.5"
                   value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center" onClick={submit}>
                Adicionar
              </button>
              <button className="btn-ghost text-xs py-1.5" onClick={() => setAdding(false)}>
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
                  className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded-xl transition-all"
                  style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = style.accent
                    ;(e.currentTarget as HTMLElement).style.borderColor = style.accent + '66'
                    ;(e.currentTarget as HTMLElement).style.background = style.bg
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}>
            <Plus size={13} /> Adicionar card
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function KanbanPage() {
  const [boards, setBoards]         = useState<Board[]>([])
  const [active, setActive]         = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [overId, setOverId]         = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [creating, setCreating]     = useState(false)
  const [loading, setLoading]       = useState(true)
  const dragOriginRef = useRef<{ cardId: string; fromColId: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/kanban/boards')
      setBoards(data)
      if (data.length) setActive((a) => a ?? data[0].id)
    } catch { toast.error('Erro ao carregar boards') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const currentBoard = boards.find((b) => b.id === active)

  const findCol = (id: string, board: Board) =>
    board.columns.find((c) => c.id === id || c.cards.some((x) => x.id === id))

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return
    try {
      const { data } = await api.post('/kanban/boards', { title: newBoardTitle.trim(), color: '#7c3aed' })
      setBoards((prev) => [...prev, data])
      setActive(data.id)
      setNewBoardTitle(''); setCreating(false)
    } catch { toast.error('Erro ao criar board') }
  }

  const deleteBoard = async (id: string) => {
    await api.delete(`/kanban/boards/${id}`)
    setBoards((prev) => prev.filter((b) => b.id !== id))
    setActive((prev) => (prev === id ? (boards.find((b) => b.id !== id)?.id ?? null) : prev))
  }

  const addCard = async (colId: string, data: { title: string; description?: string; priority: string; due_date?: string }) => {
    try {
      const { data: card } = await api.post(`/kanban/columns/${colId}/cards`, { ...data, position: 0 })
      setBoards((prev) => prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => c.id === colId ? { ...c, cards: [card, ...c.cards] } : c),
      })))
      toast.success('Card criado!')
    } catch { toast.error('Erro ao criar card') }
  }

  const saveCard = async (cardId: string, updates: Partial<Card>) => {
    const board = boards.find((b) => b.id === active)
    if (!board) return
    const card = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
    if (!card) return
    try {
      const { data: updated } = await api.patch(`/kanban/cards/${cardId}`, { ...card, ...updates })
      setBoards((prev) => prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => ({
          ...c, cards: c.cards.map((x) => x.id === cardId ? { ...x, ...updated } : x),
        })),
      })))
      toast.success('Card atualizado!')
    } catch { toast.error('Erro ao atualizar card') }
  }

  const deleteCard = async (cardId: string) => {
    await api.delete(`/kanban/cards/${cardId}`)
    setBoards((prev) => prev.map((b) => ({
      ...b, columns: b.columns.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== cardId) })),
    })))
    toast.success('Card removido!')
  }

  // ── DnD handlers ──
  const handleDragStart = (e: DragStartEvent) => {
    if (!currentBoard) return
    const card = currentBoard.columns.flatMap((c) => c.cards).find((c) => c.id === e.active.id)
    if (!card) return
    setActiveCard(card)
    const col = currentBoard.columns.find((c) => c.cards.some((x) => x.id === card.id))
    if (col) dragOriginRef.current = { cardId: card.id, fromColId: col.id }
  }

  const handleDragOver = (e: DragOverEvent) => {
    const { active: a, over } = e
    if (!over || !currentBoard) { setOverId(null); return }

    const activeCol = currentBoard.columns.find((c) => c.cards.some((x) => x.id === a.id))
    if (!activeCol) return

    let targetColId: string | null = null
    // dropped on a card → find its column
    const overCard = currentBoard.columns.flatMap((c) => c.cards).find((c) => c.id === over.id)
    if (overCard) {
      targetColId = currentBoard.columns.find((c) => c.cards.some((x) => x.id === over.id))?.id ?? null
    } else {
      // dropped on column directly
      targetColId = currentBoard.columns.find((c) => c.id === over.id)?.id ?? null
    }
    if (!targetColId) { setOverId(null); return }

    setOverId(targetColId)

    if (targetColId === activeCol.id) return // same col → no optimistic move

    // Optimistic cross-column move
    const movingCard = activeCol.cards.find((c) => c.id === a.id)!
    setBoards((prev) => prev.map((b) => {
      if (b.id !== currentBoard.id) return b
      return {
        ...b,
        columns: b.columns.map((c) => {
          if (c.id === activeCol.id) return { ...c, cards: c.cards.filter((x) => x.id !== a.id) }
          if (c.id === targetColId)  return { ...c, cards: [{ ...movingCard, column_id: targetColId! }, ...c.cards] }
          return c
        }),
      }
    }))
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null)
    setOverId(null)
    const { active: a, over } = e
    const origin = dragOriginRef.current
    dragOriginRef.current = null
    if (!over || !currentBoard || !origin) return

    const fromColId = origin.fromColId

    // Determine target col
    let toColId: string | null = null
    const overCard = currentBoard.columns.flatMap((c) => c.cards).find((c) => c.id === over.id)
    if (overCard) {
      toColId = currentBoard.columns.find((c) => c.cards.some((x) => x.id === over.id))?.id ?? null
    } else {
      toColId = currentBoard.columns.find((c) => c.id === over.id)?.id ?? null
    }
    if (!toColId) return

    if (fromColId === toColId) {
      // Reorder
      const col = currentBoard.columns.find((c) => c.id === fromColId)!
      const oldIdx = col.cards.findIndex((c) => c.id === a.id)
      const newIdx = col.cards.findIndex((c) => c.id === over.id)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
      const reordered = arrayMove(col.cards, oldIdx, newIdx)
      setBoards((prev) => prev.map((b) => ({
        ...b, columns: b.columns.map((c) => c.id === fromColId ? { ...c, cards: reordered } : c),
      })))
    } else {
      // Cross-column — persist
      const card = currentBoard.columns.flatMap((c) => c.cards).find((c) => c.id === a.id)
      if (!card) return
      try {
        await api.patch(`/kanban/cards/${card.id}`, { ...card, column_id: toColId })
        toast.success('Card movido!')
      } catch { toast.error('Erro ao mover card'); load() }
    }
  }

  if (loading) return (
    <div className="p-4 md:p-8 flex flex-col gap-6">
      <div className="shimmer h-8 w-48 rounded-xl" />
      <div className="flex gap-5">
        {[0,1,2].map((i) => (
          <div key={i} className="w-72 shrink-0 rounded-2xl p-4 space-y-3"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="shimmer h-5 w-32 rounded" />
            {[0,1].map((j) => <div key={j} className="shimmer h-20 rounded-xl" />)}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col" style={{height:"100%",minHeight:0}}>
      {/* Modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={saveCard}
          onDelete={deleteCard}
        />
      )}

      {/* Header */}
      <div className="px-3 py-2 md:px-6 md:py-4 flex items-center gap-2 shrink-0 overflow-hidden"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Kanban</h1>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide min-w-0">
          {boards.map((b) => (
            <button key={b.id} onClick={() => setActive(b.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={active === b.id
                      ? { background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }
                      : { color: 'var(--text-muted)', border: '1px solid transparent' }}
                    onMouseEnter={(e) => { if (active !== b.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border)' }}
                    onMouseLeave={(e) => { if (active !== b.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
              {b.title}
            </button>
          ))}
          {creating ? (
            <div className="flex items-center gap-2 shrink-0">
              <input autoFocus className="input text-sm py-1.5 w-40" placeholder="Nome do board"
                     value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setCreating(false) }} />
              <button className="btn-primary text-xs py-1.5" onClick={createBoard}>OK</button>
              <button className="btn-ghost text-xs" onClick={() => setCreating(false)}>✕</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)}
                    className="shrink-0 flex items-center gap-1.5 text-xs px-2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <Plus size={13} /> Novo board
            </button>
          )}
        </div>
        {currentBoard && (
          <button onClick={() => deleteBoard(currentBoard.id)} className="btn-danger text-xs shrink-0">
            <Trash2 size={13} /> <span className="hidden sm:inline">Excluir board</span>
          </button>
        )}
      </div>

      {/* Board */}
      {!currentBoard ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-center">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum board. Crie um acima.</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-4 scrollbar-hide" style={{minHeight:0}}>
            <div className="flex gap-3 md:gap-4 h-full items-start pb-2" style={{minWidth:"max-content"}}>
              {currentBoard.columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  isOver={overId === col.id}
                  activeId={activeCard?.id ?? null}
                  onAddCard={addCard}
                  onEditCard={setEditingCard}
                />
              ))}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeCard && (() => {
              const idx = currentBoard.columns.find((c) => c.cards.some((x) => x.id === activeCard.id))?.position ?? 0
              const style = COL_STYLES[idx % 3] ?? COL_STYLES[0]
              const prioConfig = PRIORITY[activeCard.priority as keyof typeof PRIORITY] ?? PRIORITY.medium
              return (
                <div className="rounded-xl p-3 rotate-2"
                     style={{width:"min(288px,80vw)",
                       background: 'var(--bg-card)',
                       border: `1px solid ${style.accent}66`,
                       boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${style.accent}33`,
                     }}>
                  <div className="w-full h-0.5 rounded-full mb-2.5" style={{ background: prioConfig.bg }}>
                    <div className="h-full rounded-full w-full" style={{ background: prioConfig.color, opacity: 0.5 }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{activeCard.title}</p>
                  {activeCard.description && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{activeCard.description}</p>
                  )}
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
