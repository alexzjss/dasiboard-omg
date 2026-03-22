// ── Portátil theme: Save State — snapshots page state to localStorage ─────────
import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Save, Clock } from 'lucide-react'

interface SaveSlot {
  slot: number
  label: string
  pathname: string
  timestamp: string
  scrollY: number
  theme: string
}

const SAVE_KEY = 'dasiboard-save-states'

function loadSlots(): SaveSlot[] {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]') } catch { return [] }
}

const ROUTE_NAMES: Record<string, string> = {
  '/':         'Início', '/kanban': 'Kanban', '/grades': 'Disciplinas',
  '/calendar': 'Calendário', '/entities': 'Entidades', '/docentes': 'Docentes', '/profile': 'Perfil',
}

export function PortatilSaveState() {
  const { theme } = useTheme()
  const location  = useLocation()
  const [slots, setSlots] = useState<SaveSlot[]>(loadSlots)
  const [show, setShow]   = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)

  const isPortatil = theme.id === 'light-portatil'

  if (!isPortatil) return null

  const save = (slot: number) => {
    const entry: SaveSlot = {
      slot,
      label: ROUTE_NAMES[location.pathname] ?? location.pathname,
      pathname: location.pathname,
      timestamp: new Date().toISOString(),
      scrollY: window.scrollY,
      theme: theme.id,
    }
    const next = [...slots.filter(s => s.slot !== slot), entry].sort((a, b) => a.slot - b.slot)
    setSlots(next)
    localStorage.setItem(SAVE_KEY, JSON.stringify(next))
    setLastSaved(slot)
    setTimeout(() => setLastSaved(null), 1500)
  }

  // 3 save slots shown as Game Boy-style UI
  const SLOTS = [1, 2, 3]

  return (
    <>
      {/* Save state button — floating, Game Boy style */}
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label="Save States"
        title="Save States"
        style={{
          position: 'fixed', bottom: 72, right: 16, zIndex: 40,
          width: 44, height: 44,
          background: '#0f380f',
          border: '3px solid #306230',
          borderRadius: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          boxShadow: '3px 3px 0 #000',
          cursor: 'pointer',
          imageRendering: 'pixelated',
        }}
      >
        <Save size={14} color="#8bac0f" />
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: '#8bac0f', letterSpacing: '0.05em' }}>SAVE</span>
      </button>

      {/* Save state panel */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(15,56,15,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setShow(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            background: '#0f380f',
            border: '3px solid #306230',
            borderRadius: '4px 4px 0 0',
            borderBottom: 'none',
            fontFamily: '"Press Start 2P", monospace',
            imageRendering: 'pixelated',
          }}>
            {/* Title bar */}
            <div style={{ background: '#306230', padding: '8px 12px', borderBottom: '2px solid #8bac0f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#9bbc0f', fontSize: 8, letterSpacing: '0.05em' }}>SAVE STATE</span>
              <button type="button" onClick={() => setShow(false)} style={{ color: '#9bbc0f', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Slots */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SLOTS.map(s => {
                const saved = slots.find(sl => sl.slot === s)
                const isSaving = lastSaved === s
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#182c00', border: `2px solid ${isSaving ? '#9bbc0f' : '#306230'}`, borderRadius: 2 }}>
                    {/* Slot number */}
                    <div style={{ width: 28, height: 28, background: '#306230', border: '2px solid #8bac0f', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#9bbc0f', fontSize: 10 }}>{s}</span>
                    </div>
                    {/* Slot info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {saved ? (
                        <>
                          <p style={{ color: '#9bbc0f', fontSize: 7, marginBottom: 2 }}>{saved.label.toUpperCase()}</p>
                          <p style={{ color: 'rgba(139,172,15,0.5)', fontSize: 6 }}>
                            {format(new Date(saved.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </>
                      ) : (
                        <p style={{ color: 'rgba(139,172,15,0.3)', fontSize: 7 }}>— VAZIO —</p>
                      )}
                    </div>
                    {/* Save button */}
                    <button
                      type="button"
                      onClick={() => save(s)}
                      style={{
                        background: isSaving ? '#9bbc0f' : '#306230',
                        border: `2px solid ${isSaving ? '#0f380f' : '#8bac0f'}`,
                        color: isSaving ? '#0f380f' : '#9bbc0f',
                        fontFamily: '"Press Start 2P", monospace',
                        fontSize: 6, padding: '4px 6px', borderRadius: 2, cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {isSaving ? '✓ SALVO' : 'SALVAR'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '6px 12px 10px', borderTop: '2px solid #306230', textAlign: 'center' }}>
              <p style={{ color: 'rgba(139,172,15,0.4)', fontSize: 6, letterSpacing: '0.05em' }}>
                SELECIONE UM SLOT PARA SALVAR
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
