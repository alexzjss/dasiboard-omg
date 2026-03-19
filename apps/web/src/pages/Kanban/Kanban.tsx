import { useState, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import {
  useKanbanBoard, useCreateKanbanCard, useUpdateKanbanCard,
  useDeleteKanbanCard, useReorderKanban, useClearDoneKanban,
  KanbanCard,
} from '../../api/hooks'
import { PageHeader, Spinner, Modal, Button, EmptyState } from '../../components/ui/index'

type Column = 'todo' | 'doing' | 'done'
type Tag = 'prova' | 'entrega' | 'leitura' | 'projeto' | 'pessoal'

const COL_META: Record<Column, { label: string; color: string }> = {
  todo:  { label: 'A fazer',       color: '#f87171' },
  doing: { label: 'Em andamento',  color: '#fbbf24' },
  done:  { label: 'Concluído',     color: '#34d399' },
}

const TAG_META: Record<Tag, { label: string; bg: string; color: string }> = {
  prova:    { label: '🔴 Prova',     bg: 'rgba(248,113,113,.15)', color: 'var(--danger)' },
  entrega:  { label: '🟡 Entrega',   bg: 'rgba(251,191,36,.15)',  color: 'var(--warning)' },
  leitura:  { label: '📘 Leitura',   bg: 'rgba(96,165,250,.15)',  color: 'var(--info)' },
  projeto:  { label: '🟣 Projeto',   bg: 'rgba(167,139,250,.15)', color: 'var(--secondary)' },
  pessoal:  { label: '⚪ Pessoal',   bg: 'rgba(134,239,172,.15)', color: 'var(--success)' },
}

function dueMeta(dueDate?: string | null) {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { label: `Atrasado ${Math.abs(diff)}d`, cls: 'due--overdue' }
  if (diff === 0) return { label: 'Hoje', cls: 'due--soon' }
  if (diff <= 3)  return { label: `${diff}d`, cls: 'due--soon' }
  return { label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), cls: '' }
}

export default function Kanban() {
  const user = useAuthStore((s) => s.user)
  const { data: board, isLoading } = useKanbanBoard()
  const createCard = useCreateKanbanCard()
  const updateCard = useUpdateKanbanCard()
  const deleteCard = useDeleteKanbanCard()
  const reorder = useReorderKanban()
  const clearDone = useClearDoneKanban()

  // New card form
  const [newTitle, setNewTitle] = useState('')
  const [newCol, setNewCol] = useState<Column>('todo')
  const [newTag, setNewTag] = useState<Tag | ''>('')
  const newInputRef = useRef<HTMLInputElement>(null)

  // Edit modal
  const [editCard, setEditCard] = useState<KanbanCard | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTag, setEditTag] = useState<Tag | ''>('')
  const [editDue, setEditDue] = useState('')

  // Drag state
  const dragId = useRef<string | null>(null)
  const dragCol = useRef<Column | null>(null)

  function addCard() {
    if (!newTitle.trim()) return
    createCard.mutate({ title: newTitle.trim(), column: newCol, tag: newTag || undefined })
    setNewTitle('')
    newInputRef.current?.focus()
  }

  function openEdit(card: KanbanCard) {
    setEditCard(card)
    setEditTitle(card.title)
    setEditDesc(card.description ?? '')
    setEditTag((card.tag as Tag | '') ?? '')
    setEditDue(card.dueDate ? card.dueDate.slice(0, 10) : '')
  }

  function saveEdit() {
    if (!editCard) return
    updateCard.mutate({
      id: editCard.id,
      title: editTitle,
      description: editDesc || undefined,
      tag: (editTag as Tag) || null,
      dueDate: editDue || null,
    })
    setEditCard(null)
  }

  function onDragStart(id: string, col: Column) {
    dragId.current = id; dragCol.current = col
  }

  function onDrop(targetCol: Column) {
    if (!board || !dragId.current) return
    const id = dragId.current
    const srcCol = dragCol.current!

    // Build new column arrays
    const next = {
      todo: board.todo.map((c) => c.id),
      doing: board.doing.map((c) => c.id),
      done: board.done.map((c) => c.id),
    }
    next[srcCol] = next[srcCol].filter((i) => i !== id)
    next[targetCol] = [...next[targetCol], id]
    reorder.mutate(next)
    dragId.current = null; dragCol.current = null
  }

  if (!user) {
    return (
      <div>
        <PageHeader eyebrow="Organização de tarefas" title="Quadro Kanban" />
        <EmptyState icon="🔒" title="Login necessário" description="Faça login para usar o Kanban sincronizado na nuvem." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Organização de tarefas"
        title="Quadro Kanban"
        description="Gerencie suas tarefas acadêmicas. Dados salvos automaticamente na nuvem."
      />

      {/* Toolbar */}
      <div className="kanban-toolbar anim-fade-up stagger-2">
        <input
          ref={newInputRef}
          className="kanban-input"
          placeholder="Nova tarefa… Enter para adicionar"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCard()}
          maxLength={120}
        />
        <select className="kanban-select" value={newCol} onChange={(e) => setNewCol(e.target.value as Column)}>
          {Object.entries(COL_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="kanban-select" value={newTag} onChange={(e) => setNewTag(e.target.value as Tag | '')}>
          <option value="">Sem tag</option>
          {Object.entries(TAG_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <Button onClick={addCard} disabled={!newTitle.trim() || createCard.isPending}>+ Adicionar</Button>
        <Button variant="ghost" onClick={() => clearDone.mutate()}>Limpar concluídos</Button>
      </div>

      {/* Board */}
      {isLoading ? (
        <Spinner text="Carregando quadro..." />
      ) : board && (
        <div className="kanban-board anim-fade-up stagger-3">
          {(['todo', 'doing', 'done'] as Column[]).map((col) => (
            <div
              key={col}
              className="kanban-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-dot" style={{ background: COL_META[col].color }} />
                <span className="kanban-col-label">{COL_META[col].label}</span>
                <span className="kanban-col-count">{board[col].length}</span>
              </div>
              <div className="kanban-cards">
                {board[col].length === 0 && (
                  <div className="kanban-empty">
                    {col === 'todo' ? 'Nenhuma tarefa' : col === 'doing' ? 'Nada em andamento' : 'Nada concluído'}
                  </div>
                )}
                {board[col].map((card) => {
                  const tag = card.tag ? TAG_META[card.tag as Tag] : null
                  const due = dueMeta(card.dueDate)
                  return (
                    <div
                      key={card.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => onDragStart(card.id, col)}
                    >
                      <div className="kanban-card-top">
                        <span className="kanban-card-title">{card.title}</span>
                        <div className="kanban-card-actions">
                          <button className="card-action-btn" onClick={() => openEdit(card)} title="Editar">✏️</button>
                          <button
                            className="card-action-btn card-action-btn--del"
                            onClick={() => deleteCard.mutate(card.id)}
                            title="Remover"
                          >✕</button>
                        </div>
                      </div>
                      {card.description && (
                        <div className="kanban-card-desc">{card.description}</div>
                      )}
                      <div className="kanban-card-footer">
                        {tag && (
                          <span className="kanban-tag" style={{ background: tag.bg, color: tag.color }}>
                            {tag.label}
                          </span>
                        )}
                        {due && (
                          <span className={`kanban-due ${due.cls}`}>{due.label}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editCard} onClose={() => setEditCard(null)} title="Editar tarefa" maxWidth={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="kanban-input" value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Título da tarefa"
          />
          <textarea
            className="kanban-input" value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Descrição (opcional)" rows={3}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              className="kanban-select" style={{ flex: 1 }}
              value={editTag} onChange={(e) => setEditTag(e.target.value as Tag | '')}
            >
              <option value="">Sem tag</option>
              {Object.entries(TAG_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              type="date" className="kanban-input" style={{ flex: 1 }}
              value={editDue} onChange={(e) => setEditDue(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button onClick={saveEdit} disabled={!editTitle.trim()}>Salvar</Button>
            <Button variant="ghost" onClick={() => setEditCard(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .kanban-toolbar {
          display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; align-items: center;
        }
        .kanban-input {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 8px 12px; color: var(--text);
          font-size: 13px; flex: 1; min-width: 180px; font-family: inherit;
        }
        .kanban-input:focus { outline: none; border-color: var(--primary); }
        .kanban-input::placeholder { color: var(--text-dim); }
        .kanban-select {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 8px 10px; color: var(--text);
          font-size: 13px; cursor: pointer;
        }
        .kanban-board {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        .kanban-col {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 14px; min-height: 200px;
        }
        .kanban-col-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
        }
        .kanban-col-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .kanban-col-label { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
        .kanban-col-count {
          font-size: 11px; font-weight: 600; padding: 1px 6px;
          border-radius: 4px; background: var(--bg3); color: var(--text-muted);
        }
        .kanban-cards { display: flex; flex-direction: column; gap: 8px; }
        .kanban-empty {
          text-align: center; font-size: 13px; color: var(--text-dim);
          padding: 24px 0;
        }
        .kanban-card {
          background: var(--bg2); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 10px 12px; cursor: grab;
          transition: border-color 0.15s;
        }
        .kanban-card:hover { border-color: var(--border); }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card-top {
          display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;
        }
        .kanban-card-title { flex: 1; font-size: 13px; color: var(--text); line-height: 1.4; }
        .kanban-card-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
        .kanban-card-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
        .kanban-card:hover .kanban-card-actions { opacity: 1; }
        .card-action-btn {
          background: none; border: none; cursor: pointer; font-size: 12px;
          padding: 2px 4px; border-radius: 4px; color: var(--text-dim);
          transition: all 0.15s;
        }
        .card-action-btn:hover { background: var(--glass); color: var(--text-muted); }
        .card-action-btn--del:hover { color: var(--danger); }
        .kanban-card-footer { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .kanban-tag {
          font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
        }
        .kanban-due {
          font-size: 11px; color: var(--text-dim); margin-left: auto;
        }
        .due--soon { color: var(--warning); }
        .due--overdue { color: var(--danger); }

        @media (max-width: 768px) {
          .kanban-board { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
