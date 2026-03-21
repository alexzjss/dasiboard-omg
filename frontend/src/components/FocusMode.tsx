// ── Focus Mode — hides sidebar/nav, shows minimal bar ─────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Minimize2, X } from 'lucide-react'

const STORAGE_KEY = 'dasiboard-focus-mode'

export function useFocusMode() {
  const [active, setActive] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  const toggle = useCallback(() => {
    setActive(v => {
      const next = !v
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const exit = useCallback(() => {
    setActive(false)
    localStorage.setItem(STORAGE_KEY, '0')
  }, [])

  // Apply/remove CSS class on html element
  useEffect(() => {
    const root = document.documentElement
    if (active) {
      root.setAttribute('data-focus-mode', '1')
    } else {
      root.removeAttribute('data-focus-mode')
    }
    return () => root.removeAttribute('data-focus-mode')
  }, [active])

  // Shortcut: Ctrl+Shift+F
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [toggle])

  return { active, toggle, exit }
}

// ── Focus mode minimal overlay bar ────────────────────────
export function FocusModeBar({ onExit }: { onExit: () => void }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4"
      style={{
        height: 36,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2">
        <Minimize2 size={13} style={{ color: 'var(--accent-3)' }} />
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Modo Foco
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono hidden sm:block" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Ctrl+Shift+F para sair
        </span>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
          aria-label="Sair do modo foco"
        >
          <X size={11} /> Sair
        </button>
      </div>
    </div>
  )
}

// ── Focus mode CSS injection ──────────────────────────────
// Applied via data-focus-mode="1" on html element (see globals.css)
