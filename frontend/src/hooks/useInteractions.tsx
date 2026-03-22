import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Keyboard, X } from 'lucide-react'

// ── Swipe Gestures Hook ───────────────────────────────────
const ROUTES = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile']

export function useSwipeNavigation() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Block swipe on entire kanban route and explicit opt-out zones
      if (
        location.pathname === '/kanban' ||
        target.closest('.kanban-scroll') ||
        target.closest('.grades-fluxo') ||
        target.closest('[data-no-swipe]') ||
        target.closest('[data-kanban-col]')
      ) return
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      const dy = e.changedTouches[0].clientY - touchStart.current.y
      const dt = Date.now() - touchStart.current.time

      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7 || dt > 400) return

      const idx = ROUTES.indexOf(location.pathname)
      if (dx < -60 && idx < ROUTES.length - 1) {
        navigate(ROUTES[idx + 1])
      } else if (dx > 60 && idx > 0) {
        navigate(ROUTES[idx - 1])
      }
      touchStart.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [navigate, location.pathname])
}

// ── Keyboard Shortcuts Hook ───────────────────────────────
export interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  group: string
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      // Ignore contentEditable
      if ((e.target as HTMLElement).isContentEditable) return

      for (const s of shortcuts) {
        const ctrlMatch  = (s.ctrl  ?? false) === (e.ctrlKey  || e.metaKey)
        const shiftMatch = (s.shift ?? false) === e.shiftKey
        const altMatch   = (s.alt   ?? false) === e.altKey
        const keyMatch   = s.key.toLowerCase() === e.key.toLowerCase()

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault()
          s.action()
          return
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}

// ── Keyboard Shortcuts Help Modal ────────────────────────
interface ShortcutGroup {
  group: string
  items: Omit<Shortcut, 'action'>[]
}

export function KeyboardHelpModal({ shortcuts, onClose }: {
  shortcuts: Omit<Shortcut, 'action'>[]
  onClose: () => void
}) {
  const groups = shortcuts.reduce<ShortcutGroup[]>((acc, s) => {
    let g = acc.find(x => x.group === s.group)
    if (!g) { g = { group: s.group, items: [] }; acc.push(g) }
    g.items.push(s)
    return acc
  }, [])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '80dvh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Keyboard size={17} style={{ color: 'var(--accent-3)' }} />
            Atalhos de teclado
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                  aria-label="Fechar">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          {groups.map(g => (
            <div key={g.group}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                 style={{ color: 'var(--accent-3)' }}>{g.group}</p>
              <div className="space-y-1.5">
                {g.items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.ctrl  && <KbdKey>Ctrl</KbdKey>}
                      {s.shift && <KbdKey>⇧</KbdKey>}
                      {s.alt   && <KbdKey>Alt</KbdKey>}
                      <KbdKey>{s.key === 'Escape' ? 'Esc' : s.key === 'ArrowRight' ? '→' : s.key === 'ArrowLeft' ? '←' : s.key.toUpperCase()}</KbdKey>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pressione <KbdKey>?</KbdKey> para abrir/fechar
          </p>
        </div>
      </div>
    </div>
  )
}

function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 6px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
      color: 'var(--text-secondary)', minWidth: 22,
      boxShadow: '0 2px 0 var(--border)',
    }}>
      {children}
    </kbd>
  )
}

// ── Floating keyboard help button ─────────────────────────
export function KeyboardHelpButton({ onClick }: { onClick: () => void }) {
  // Only show on non-touch devices
  const [show, setShow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setShow(mq.matches)
    const handler = (e: MediaQueryListEvent) => setShow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={onClick}
      aria-label="Ver atalhos de teclado"
      title="Atalhos de teclado (?)"
      className="fixed z-40 transition-all hover:scale-110 active:scale-95"
      style={{
        bottom: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-light)',
        color: 'var(--text-muted)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <Keyboard size={15} />
    </button>
  )
}
