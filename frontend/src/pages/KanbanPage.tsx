import { useEffect, useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical, AlertCircle, Clock, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

interface Card   { id: string; title: string; description?: string; priority: string; due_date?: string; position: number; column_id: string }
interface Column { id: string; title: string; position: number; cards: Card[] }
interface Board  { id: string; title: string; color: string; columns: Column[] }

// ── Sortable Card ─────────────────────────────────────────
function KanbanCard({ card, onDelete }: { card: Card; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const priorityColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-500' }[card.priority] ?? 'text-slate-500'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-slate-800 border border-slate-700 rounded-xl p-3 group hover:border-slate-600 transition-all',
        isDragging && 'opacity-40 rotate-1'
      )}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 font-medium leading-snug">{card.title}</p>
          {card.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Flag size={11} className={priorityColor} />
            <span className={`text-[10px] ${priorityColor}`}>{card.priority}</span>
            {card.due_date && (
              <>
                <Clock size={11} className="text-slate-600" />
                <span className="text-[10px] text-slate-500">
                  {format(new Date(card.due_date), 'd MMM', { locale: ptBR })}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────
function KanbanColumn({
  column, onAddCard, onDeleteCard,
}: {
  column: Column
  onAddCard: (colId: string, title: string) => void
  onDeleteCard: (cardId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle]   = useState('')

  const submit = () => {
    if (!title.trim()) return
    onAddCard(column.id, title.trim())
    setTitle('')
    setAdding(false)
  }

  return (
    <div className="w-72 shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm text-white">{column.title}</h3>
        <span className="badge bg-slate-800 text-slate-500">{column.cards.length}</span>
      </div>

      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[40px]">
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onDelete={() => onDeleteCard(card.id)} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <div className="mt-3 space-y-2">
          <textarea
            autoFocus
            className="input text-sm resize-none h-16"
            placeholder="Título do card…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          />
          <div className="flex gap-2">
            <button className="btn-primary text-xs py-1.5 px-3" onClick={submit}>Adicionar</button>
            <button className="btn-ghost text-xs" onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
        >
          <Plus size={13} /> Adicionar card
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function KanbanPage() {
  const [boards, setBoards]       = useState<Board[]>([])
  const [active, setActive]       = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [creating, setCreating]   = useState(false)
  const [loading, setLoading]     = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = async () => {
    try {
      const { data } = await api.get('/kanban/boards')
      setBoards(data)
      if (!active && data.length) setActive(data[0].id)
    } catch { toast.error('Erro ao carregar boards') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const currentBoard = boards.find((b) => b.id === active)

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return
    try {
      const { data } = await api.post('/kanban/boards', { title: newBoardTitle.trim(), color: '#4d67f5' })
      setBoards((prev) => [...prev, data])
      setActive(data.id)
      setNewBoardTitle('')
      setCreating(false)
    } catch { toast.error('Erro ao criar board') }
  }

  const deleteBoard = async (id: string) => {
    await api.delete(`/kanban/boards/${id}`)
    setBoards((prev) => prev.filter((b) => b.id !== id))
    setActive((prev) => (prev === id ? boards.find((b) => b.id !== id)?.id ?? null : prev))
  }

  const addCard = async (colId: string, title: string) => {
    try {
      const { data } = await api.post(`/kanban/columns/${colId}/cards`, { title, position: 0 })
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((c) =>
            c.id === colId ? { ...c, cards: [data, ...c.cards] } : c
          ),
        }))
      )
    } catch { toast.error('Erro ao adicionar card') }
  }

  const deleteCard = async (cardId: string) => {
    await api.delete(`/kanban/cards/${cardId}`)
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => ({
          ...c,
          cards: c.cards.filter((card) => card.id !== cardId),
        })),
      }))
    )
  }

  const handleDragStart = (e: DragStartEvent) => {
    const card = currentBoard?.columns.flatMap((c) => c.cards).find((c) => c.id === e.active.id)
    if (card) setActiveCard(card)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null)
    const { active: a, over } = e
    if (!over || a.id === over.id || !currentBoard) return

    const fromCol = currentBoard.columns.find((c) => c.cards.some((card) => card.id === a.id))
    const toCol   = currentBoard.columns.find((c) => c.cards.some((card) => card.id === over.id) || c.id === over.id)
    if (!fromCol || !toCol) return

    if (fromCol.id === toCol.id) {
      const oldIdx = fromCol.cards.findIndex((c) => c.id === a.id)
      const newIdx = fromCol.cards.findIndex((c) => c.id === over.id)
      const reordered = arrayMove(fromCol.cards, oldIdx, newIdx)
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((c) => c.id === fromCol.id ? { ...c, cards: reordered } : c),
        }))
      )
    } else {
      const card = fromCol.cards.find((c) => c.id === a.id)!
      await api.patch(`/kanban/cards/${card.id}`, { ...card, column_id: toCol.id })
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((c) => {
            if (c.id === fromCol.id) return { ...c, cards: c.cards.filter((x) => x.id !== a.id) }
            if (c.id === toCol.id)   return { ...c, cards: [{ ...card, column_id: toCol.id }, ...c.cards] }
            return c
          }),
        }))
      )
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-slate-600 text-sm">Carregando…</div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-800 flex items-center gap-4">
        <h1 className="font-display text-xl font-bold text-white">Kanban</h1>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={clsx(
                'shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                active === b.id
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/40'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              )}
            >
              {b.title}
            </button>
          ))}
          {creating ? (
            <div className="flex items-center gap-2 shrink-0">
              <input
                autoFocus
                className="input text-sm py-1.5 w-40"
                placeholder="Nome do board"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setCreating(false) }}
              />
              <button className="btn-primary text-xs py-1.5" onClick={createBoard}>OK</button>
              <button className="btn-ghost text-xs" onClick={() => setCreating(false)}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors px-2"
            >
              <Plus size={13} /> Novo board
            </button>
          )}
        </div>
        {currentBoard && (
          <button onClick={() => deleteBoard(currentBoard.id)} className="btn-danger text-xs">
            <Trash2 size={13} /> Excluir
          </button>
        )}
      </div>

      {/* Board */}
      {!currentBoard ? (
        <div className="flex-1 flex items-center justify-center text-slate-600">
          <div className="text-center">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum board. Crie um acima.</p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto p-8">
            <div className="flex gap-5 h-full">
              {currentBoard.columns.map((col) => (
                <KanbanColumn key={col.id} column={col} onAddCard={addCard} onDeleteCard={deleteCard} />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeCard && (
              <div className="bg-slate-700 border border-slate-600 rounded-xl p-3 shadow-2xl rotate-2 w-72">
                <p className="text-sm text-white font-medium">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
