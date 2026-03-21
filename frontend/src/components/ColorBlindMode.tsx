// ── Daltonismo / Color Blind Mode ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Eye } from 'lucide-react'

export type ColorBlindType = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

const STORAGE_KEY = 'dasiboard-colorblind'

const LABELS: Record<ColorBlindType, string> = {
  none:         'Normal',
  protanopia:   'Protanopia (vermelho)',
  deuteranopia: 'Deuteranopia (verde)',
  tritanopia:   'Tritanopia (azul)',
}

export function useColorBlindMode() {
  const [mode, setMode] = useState<ColorBlindType>(
    () => (localStorage.getItem(STORAGE_KEY) as ColorBlindType) ?? 'none'
  )

  const apply = useCallback((m: ColorBlindType) => {
    setMode(m)
    localStorage.setItem(STORAGE_KEY, m)
    document.documentElement.setAttribute('data-colorblind', m)
  }, [])

  useEffect(() => {
    // Apply on mount
    const saved = (localStorage.getItem(STORAGE_KEY) as ColorBlindType) ?? 'none'
    document.documentElement.setAttribute('data-colorblind', saved)
  }, [])

  return { mode, apply }
}

// ── SVG Filter definitions — injected once into the DOM ──────────────────────
export function ColorBlindFilters() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {/* Protanopia — reduced red sensitivity */}
        <filter id="cb-protanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="
            0.567 0.433 0     0 0
            0.558 0.442 0     0 0
            0     0.242 0.758 0 0
            0     0     0     1 0"/>
        </filter>
        {/* Deuteranopia — reduced green sensitivity */}
        <filter id="cb-deuteranopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="
            0.625 0.375 0     0 0
            0.700 0.300 0     0 0
            0     0.300 0.700 0 0
            0     0     0     1 0"/>
        </filter>
        {/* Tritanopia — reduced blue sensitivity */}
        <filter id="cb-tritanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values="
            0.950 0.050 0     0 0
            0     0.433 0.567 0 0
            0     0.475 0.525 0 0
            0     0     0     1 0"/>
        </filter>
      </defs>
    </svg>
  )
}

// ── Toggle button (shown in sidebar or settings) ──────────────────────────────
export function ColorBlindToggle({ mode, apply }: { mode: ColorBlindType; apply: (m: ColorBlindType) => void }) {
  const [open, setOpen] = useState(false)
  const types: ColorBlindType[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia']

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: mode !== 'none' ? 'var(--accent-soft)' : 'var(--bg-elevated)',
          border: `1px solid ${mode !== 'none' ? 'var(--accent-1)' : 'var(--border)'}`,
          color: mode !== 'none' ? 'var(--accent-3)' : 'var(--text-muted)',
        }}
        title="Modo Daltonismo"
      >
        <Eye size={13} />
        <span className="flex-1 text-left truncate">
          {mode === 'none' ? 'Daltonismo' : LABELS[mode].split(' ')[0]}
        </span>
        {mode !== 'none' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: 'var(--accent-1)', color: 'white' }}>ON</span>
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden shadow-xl z-50"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {types.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { apply(t); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{
                color: mode === t ? 'var(--accent-3)' : 'var(--text-secondary)',
                background: mode === t ? 'var(--accent-soft)' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = mode === t ? 'var(--accent-soft)' : 'transparent')}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: mode === t ? 'var(--accent-3)' : 'var(--border)', display: 'inline-block', flexShrink: 0 }} />
              {LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
