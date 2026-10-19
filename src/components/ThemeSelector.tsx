import { useRef, type KeyboardEvent } from 'react'
import { THEME_OPTIONS, setThemePref, useThemePref } from '../lib/theme'

/** Radiogroup Sistema / Claro / Escuro com setas do teclado. */
export function ThemeSelector({ labelledBy, ariaLabel }: { labelledBy?: string; ariaLabel?: string }) {
  const pref = useThemePref()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
    setThemePref(THEME_OPTIONS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="segmented" role="radiogroup" aria-labelledby={labelledBy} aria-label={ariaLabel}>
      {THEME_OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          ref={(el) => { refs.current[i] = el }}
          type="button"
          role="radio"
          aria-checked={pref === opt.value}
          tabIndex={pref === opt.value ? 0 : -1}
          className={`segmented-option${pref === opt.value ? ' active' : ''}`}
          onClick={() => setThemePref(opt.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >{opt.label}</button>
      ))}
    </div>
  )
}
