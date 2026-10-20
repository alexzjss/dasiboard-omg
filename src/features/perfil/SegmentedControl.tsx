import { useRef, type KeyboardEvent } from 'react'

export type SegmentedOption<T extends string> = { value: T; label: string }

/** Radiogroup acessível (setas movem e selecionam), no mesmo visual do seletor de tema. */
export function SegmentedControl<T extends string>({ value, options, onChange, labelledBy, disabled }: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (next: T) => void
  labelledBy: string
  disabled?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="segmented" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          ref={(el) => { refs.current[i] = el }}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          disabled={disabled}
          className={`segmented-option${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
