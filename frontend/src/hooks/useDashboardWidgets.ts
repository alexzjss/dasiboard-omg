// ── Dashboard Widget Drag-and-Drop with localStorage persistence ──────────────
import { useState, useCallback, useRef } from 'react'

export type WidgetId =
  | 'greeting'
  | 'stats'
  | 'newsletter'
  | 'quicklinks'
  | 'events'

export interface WidgetDef {
  id: WidgetId
  label: string
  icon: string
  defaultVisible: boolean
}

export const WIDGET_DEFS: WidgetDef[] = [
  { id: 'greeting',   label: 'Boas-vindas',    icon: '👋', defaultVisible: true },
  { id: 'stats',      label: 'Estatísticas',   icon: '📊', defaultVisible: true },
  { id: 'newsletter', label: 'Newsletter',     icon: '📰', defaultVisible: true },
  { id: 'quicklinks', label: 'Acesso rápido',  icon: '⚡', defaultVisible: true },
  { id: 'events',     label: 'Próx. eventos',  icon: '📅', defaultVisible: true },
]

const STORAGE_KEY = 'dasiboard-widget-order'
const VISIBLE_KEY = 'dasiboard-widget-visible'

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetId[]
      // Merge: add any new widget ids that didn't exist when order was saved
      const all = WIDGET_DEFS.map(w => w.id)
      const merged = [...parsed.filter(id => all.includes(id)), ...all.filter(id => !parsed.includes(id))]
      return merged
    }
  } catch {}
  return WIDGET_DEFS.map(w => w.id)
}

function loadVisible(): Set<WidgetId> {
  try {
    const raw = localStorage.getItem(VISIBLE_KEY)
    if (raw) return new Set(JSON.parse(raw) as WidgetId[])
  } catch {}
  return new Set(WIDGET_DEFS.filter(w => w.defaultVisible).map(w => w.id))
}

export function useDashboardWidgets() {
  const [order, setOrder] = useState<WidgetId[]>(loadOrder)
  const [visible, setVisible] = useState<Set<WidgetId>>(loadVisible)
  const dragSrc = useRef<WidgetId | null>(null)

  const saveOrder = useCallback((o: WidgetId[]) => {
    setOrder(o)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
  }, [])

  const saveVisible = useCallback((v: Set<WidgetId>) => {
    setVisible(new Set(v))
    localStorage.setItem(VISIBLE_KEY, JSON.stringify([...v]))
  }, [])

  const onDragStart = useCallback((id: WidgetId) => {
    dragSrc.current = id
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, targetId: WidgetId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((targetId: WidgetId) => {
    const src = dragSrc.current
    if (!src || src === targetId) return
    const newOrder = [...order]
    const srcIdx = newOrder.indexOf(src)
    const tgtIdx = newOrder.indexOf(targetId)
    newOrder.splice(srcIdx, 1)
    newOrder.splice(tgtIdx, 0, src)
    saveOrder(newOrder)
    dragSrc.current = null
  }, [order, saveOrder])

  const toggleVisible = useCallback((id: WidgetId) => {
    const next = new Set(visible)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveVisible(next)
  }, [visible, saveVisible])

  const resetLayout = useCallback(() => {
    const def = WIDGET_DEFS.map(w => w.id)
    saveOrder(def)
    saveVisible(new Set(WIDGET_DEFS.filter(w => w.defaultVisible).map(w => w.id)))
  }, [saveOrder, saveVisible])

  return { order, visible, onDragStart, onDragOver, onDrop, toggleVisible, resetLayout }
}
