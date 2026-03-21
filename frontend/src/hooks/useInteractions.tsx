import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ── Swipe Gestures Hook ───────────────────────────────────
const ROUTES = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile']

export function useSwipeNavigation() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Ignore if inside a scrollable area (kanban, fluxogram, etc.)
      const target = e.target as HTMLElement
      if (target.closest('.kanban-scroll') || target.closest('.grades-fluxo') || target.closest('[data-no-swipe]')) return
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

      // Only horizontal swipes, fast enough, and dominant axis
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7 || dt > 400) return

      const idx = ROUTES.indexOf(location.pathname)
      if (dx < -60 && idx < ROUTES.length - 1) {
        // Swipe left → next page
        navigate(ROUTES[idx + 1])
      } else if (dx > 60 && idx > 0) {
        // Swipe right → previous page
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
      // Skip if inside input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

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
import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
                  style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          {groups.map(g => (
            <div key={g.group}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                 style={{ color: 'var(--accent-3)' }}>{g.group}</p>
              <div className="space-y-1.5">
                {g.items.map(s => (
                  <div key={s.key + s.description} className="flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.ctrl && <KbdKey>Ctrl</KbdKey>}
                      {s.shift && <KbdKey>⇧</KbdKey>}
                      {s.alt && <KbdKey>Alt</KbdKey>}
                      <KbdKey>{s.key.toUpperCase()}</KbdKey>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pressione <KbdKey inline>?</KbdKey> para abrir/fechar esta ajuda
          </p>
        </div>
      </div>
    </div>
  )
}

function KbdKey({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <kbd className={inline ? 'inline' : ''}
         style={{
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
