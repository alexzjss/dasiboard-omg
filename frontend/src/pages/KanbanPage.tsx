import { useEffect, useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical, AlertCircle, Clock, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

interface Card   { id: string; title: string; description?: string; priority: string; due_date?: string; position: number; column_id: string }
interface Column { id: string; title: string; position: number; cards: Card[] }
interface Board  { id: string; title: string; color: string; columns: Column[] }

const PRIORITY_CONFIG = {
  high:   { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  medium: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  low:    { label: 'Baixa', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)'  },
}

function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 transition-all"
        style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
        {cfg.label}
        <ChevronDown size={10} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[100] rounded-xl shadow-2xl py-1 min-w-[110px] scale-in"
             style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onChange(k); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left"
              style={{ color: v.color }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = v.bg)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KanbanCard({ card, onDelete, onChangePriority }: {
  card: Card; onDelete: () => void; onChangePriority: (p: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: 'card', card } })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        opacity: isDragging ? 0.3 : 1,
      }}
      className="rounded-xl p-3 group transition-all cursor-default"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-1)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing transition-colors"
          style={{ color: 'var(--text-muted)', touchAction: 'none' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{card.title}</p>
          {card.description && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {card.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PriorityPicker value={card.priority} onChange={onChangePriority} />
            {card.due_date && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Clock size={10} />
                {format(new Date(card.due_date), 'd MMM', { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-all mt-0.5"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Droppable Column wrapper ──────────────────────────────
function KanbanColumn({
  column, onAddCard, onDeleteCard, onChangePriority, isOver,
}: {
  column: Column
  onAddCard: (colId: string, title: string) => void
  onDeleteCard: (cardId: string) => void
  onChangePriority: (cardId: string, priority: string) => void
  isOver: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle]   = useState('')

  const submit = () => {
    if (!title.trim()) return
    onAddCard(column.id, title.trim())
    setTitle(''); setAdding(false)
  }

  const colColors = ['var(--accent-1)', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']
  const accentColor = colColors[column.position % colColors.length]

  return (
    <div
      className="w-72 shrink-0 flex flex-col rounded-2xl p-4 transition-all"
      style={{
        backgroundColor: isOver ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `1px solid ${isOver ? 'var(--accent-1)' : 'var(--border)'}`,
        boxShadow: isOver ? '0 0 0 2px var(--accent-1)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
          <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{column.title}</h3>
        </div>
        <span className="badge text-xs" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
          {column.cards.length}
        </span>
      </div>

      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[60px]">
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={() => onDeleteCard(card.id)}
              onChangePriority={(p) => onChangePriority(card.id, p)}
            />
          ))}
          {isOver && column.cards.length === 0 && (
            <div className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-xs"
                 style={{ borderColor: 'var(--accent-1)', color: 'var(--accent-3)' }}>
              Soltar aqui
            </div>
          )}
        </div>
      </SortableContext>

      {adding ? (
        <div className="mt-3 space-y-2 animate-in">
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
          className="mt-3 flex items-center gap-2 text-xs transition-colors py-1"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          <Plus size={13} /> Adicionar card
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function KanbanPage() {
  const [boards, setBoards]         = useState<Board[]>([])
  const [active, setActive]         = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [overId, setOverId]         = useState<string | null>(null)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [creating, setCreating]     = useState(false)
  const [loading, setLoading]       = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

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

  // Helper: find which column a card belongs to
  const findColOfCard = (cardId: string, board: Board) =>
    board.columns.find((c) => c.cards.some((card) => card.id === cardId))

  const findColById = (colId: string, board: Board) =>
    board.columns.find((c) => c.id === colId)

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
    setActive((prev) => (prev === id ? boards.find((b) => b.id !== id)?.id ?? null : prev))
  }

  const addCard = async (colId: string, title: string) => {
    try {
      const { data } = await api.post(`/kanban/columns/${colId}/cards`, { title, position: 0 })
      setBoards((prev) => prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => c.id === colId ? { ...c, cards: [data, ...c.cards] } : c),
      })))
    } catch { toast.error('Erro ao adicionar card') }
  }

  const deleteCard = async (cardId: string) => {
    await api.delete(`/kanban/cards/${cardId}`)
    setBoards((prev) => prev.map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({ ...c, cards: c.cards.filter((card) => card.id !== cardId) })),
    })))
  }

  const changePriority = async (cardId: string, priority: string) => {
    const card = currentBoard?.columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
    if (!card) return
    await api.patch(`/kanban/cards/${cardId}`, { ...card, priority })
    setBoards((prev) => prev.map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({
        ...c, cards: c.cards.map((x) => x.id === cardId ? { ...x, priority } : x),
      })),
    })))
  }

  const handleDragStart = (e: DragStartEvent) => {
    const card = currentBoard?.columns.flatMap((c) => c.cards).find((c) => c.id === e.active.id)
    if (card) setActiveCard(card)
  }

  const handleDragOver = (e: DragOverEvent) => {
    const { active: a, over } = e
    if (!over || !currentBoard) { setOverId(null); return }

    const activeCol = findColOfCard(String(a.id), currentBoard)
    if (!activeCol) return

    // Determine target column
    let targetCol = findColOfCard(String(over.id), currentBoard)
    if (!targetCol) targetCol = findColById(String(over.id), currentBoard)
    if (!targetCol || targetCol.id === activeCol.id) { setOverId(null); return }

    // Optimistic move for visual feedback
    setOverId(targetCol.id)
    const card = activeCol.cards.find((c) => c.id === a.id)!
    setBoards((prev) => prev.map((b) => {
      if (b.id !== currentBoard.id) return b
      return {
        ...b,
        columns: b.columns.map((c) => {
          if (c.id === activeCol.id) return { ...c, cards: c.cards.filter((x) => x.id !== a.id) }
          if (c.id === targetCol!.id) return { ...c, cards: [{ ...card, column_id: targetCol!.id }, ...c.cards] }
          return c
        }),
      }
    }))
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null)
    setOverId(null)
    const { active: a, over } = e
    if (!over || !currentBoard) return

    const fromCol = findColOfCard(String(a.id), currentBoard)
    if (!fromCol) return

    let toCol = findColOfCard(String(over.id), currentBoard)
    if (!toCol) toCol = findColById(String(over.id), currentBoard)
    if (!toCol) return

    if (fromCol.id === toCol.id) {
      // Reorder within same column
      const oldIdx = fromCol.cards.findIndex((c) => c.id === a.id)
      const newIdx = fromCol.cards.findIndex((c) => c.id === over.id)
      if (oldIdx === newIdx) return
      const reordered = arrayMove(fromCol.cards, oldIdx, newIdx)
      setBoards((prev) => prev.map((b) => ({
        ...b,
        columns: b.columns.map((c) => c.id === fromCol.id ? { ...c, cards: reordered } : c),
      })))
    } else {
      // Cross-column move — persist to backend
      const card = fromCol.cards.find((c) => c.id === a.id) ??
        toCol.cards.find((c) => c.id === a.id)
      if (!card) return
      try {
        await api.patch(`/kanban/cards/${card.id}`, { ...card, column_id: toCol.id })
      } catch { toast.error('Erro ao mover card'); load() }
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando…</div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Kanban</h1>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={active === b.id
                ? { background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }
                : { color: 'var(--text-muted)', border: '1px solid transparent' }}
              onMouseEnter={(e) => { if (active !== b.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border)' }}
              onMouseLeave={(e) => { if (active !== b.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
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
              className="shrink-0 flex items-center gap-1.5 text-xs transition-colors px-2"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
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
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-center">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum board. Crie um acima.</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto p-8">
            <div className="flex gap-5 h-full">
              {currentBoard.columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  isOver={overId === col.id}
                  onAddCard={addCard}
                  onDeleteCard={deleteCard}
                  onChangePriority={changePriority}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeCard && (
              <div className="rounded-xl p-3 shadow-2xl rotate-2 w-72"
                   style={{
                     background: 'var(--bg-card)',
                     border: '1px solid var(--accent-1)',
                     boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--accent-1)',
                   }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{activeCard.title}</p>
                <div className="mt-2">
                  <PriorityPicker value={activeCard.priority} onChange={() => {}} />
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
