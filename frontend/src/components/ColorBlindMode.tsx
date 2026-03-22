// ── Daltonismo / Color Blind Mode — SVG DOM injection (browser-compatible) ─────
import { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, Check } from 'lucide-react'

export type ColorBlindType = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
const STORAGE_KEY = 'dasiboard-colorblind'

export const CB_LABELS: Record<ColorBlindType, string> = {
  none: 'Normal', protanopia: 'Protanopia',
  deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia',
}
const CB_DESC: Record<ColorBlindType, string> = {
  none: 'Visão normal', protanopia: 'Dificuldade com vermelho',
  deuteranopia: 'Dificuldade com verde', tritanopia: 'Dificuldade com azul',
}

// ColorMatrix values per type
const CB_MATRICES: Record<string, number[]> = {
  protanopia:   [0.567,0.433,0,0,0, 0.558,0.442,0,0,0, 0,0.242,0.758,0,0, 0,0,0,1,0],
  deuteranopia: [0.625,0.375,0,0,0, 0.700,0.300,0,0,0, 0,0.300,0.700,0,0, 0,0,0,1,0],
  tritanopia:   [0.950,0.050,0,0,0, 0,0.433,0.567,0,0, 0,0.475,0.525,0,0, 0,0,0,1,0],
}

const SVG_ID   = 'dasiboard-cb-svg'
const FILTER_ID = 'dasiboard-cb-filter'

// Inject/update a real SVG <filter> element in the DOM body
function applyFilter(mode: ColorBlindType) {
  const root = document.documentElement

  // Remove old SVG if exists
  document.getElementById(SVG_ID)?.remove()

  if (mode === 'none') {
    root.style.filter = ''
    return
  }

  const matrix = CB_MATRICES[mode]
  const svgNS = 'http://www.w3.org/2000/svg'

  const svg = document.createElementNS(svgNS, 'svg')
  svg.id = SVG_ID
  svg.setAttribute('xmlns', svgNS)
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;'
  svg.setAttribute('aria-hidden', 'true')

  const defs = document.createElementNS(svgNS, 'defs')
  const filter = document.createElementNS(svgNS, 'filter')
  filter.id = FILTER_ID

  const feColorMatrix = document.createElementNS(svgNS, 'feColorMatrix')
  feColorMatrix.setAttribute('type', 'matrix')
  feColorMatrix.setAttribute('values', matrix.join(' '))

  filter.appendChild(feColorMatrix)
  defs.appendChild(filter)
  svg.appendChild(defs)
  document.body.insertBefore(svg, document.body.firstChild)

  root.style.filter = `url(#${FILTER_ID})`
}

export function useColorBlindMode() {
  const [mode, setMode] = useState<ColorBlindType>(
    () => (localStorage.getItem(STORAGE_KEY) as ColorBlindType) ?? 'none'
  )

  const apply = useCallback((m: ColorBlindType) => {
    setMode(m)
    localStorage.setItem(STORAGE_KEY, m)
    applyFilter(m)
  }, [])

  // Apply on mount
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ColorBlindType) ?? 'none'
    applyFilter(saved)
  }, [])

  return { mode, apply }
}

// Kept for AppLayout compatibility
export function ColorBlindFilters() { return null }

export function ColorBlindButton({ mode, apply }: { mode: ColorBlindType; apply: (m: ColorBlindType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const types: ColorBlindType[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia']
  const active = mode !== 'none'

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="flex-1 relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
        style={{
          background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
          border: `1px solid ${active ? 'var(--accent-1)' : 'var(--border)'}`,
          color: active ? 'var(--accent-3)' : 'var(--text-muted)',
        }}
        title="Modo Daltonismo"
      >
        <Eye size={14} />
        <span>{active ? CB_LABELS[mode].slice(0, 5) : 'Visão'}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1.5 rounded-xl overflow-hidden shadow-xl z-[60] min-w-[190px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        >
          <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Simulação de visão
          </p>
          {types.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { apply(t); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors"
              style={{
                color: mode === t ? 'var(--accent-3)' : 'var(--text-secondary)',
                background: mode === t ? 'var(--accent-soft)' : 'transparent',
              }}
              onMouseEnter={e => { if (mode !== t) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { if (mode !== t) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                   style={{ background: mode === t ? 'var(--accent-3)' : 'var(--border)' }}>
                {mode === t && <Check size={8} color="white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[11px]">{CB_LABELS[t]}</p>
                <p className="text-[9px] opacity-60">{CB_DESC[t]}</p>
              </div>
            </button>
          ))}
          <div className="h-2" />
        </div>
      )}
    </div>
  )
}

export function ColorBlindToggle({ mode, apply }: { mode: ColorBlindType; apply: (m: ColorBlindType) => void }) {
  return <ColorBlindButton mode={mode} apply={apply} />
}
