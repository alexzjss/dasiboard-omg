import { useState, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2, X, Monitor } from 'lucide-react'

interface PresentationState {
  active: boolean
  fontSize: 'normal' | 'large' | 'xl'
  showControls: boolean
}

const STORAGE_KEY = 'dasiboard-presentation'

export function usePresentationMode() {
  const [state, setState] = useState<PresentationState>(() => ({
    active: false,
    fontSize: 'large',
    showControls: true,
  }))

  const toggle = useCallback(() => {
    setState(s => ({ ...s, active: !s.active }))
  }, [])

  const setFontSize = useCallback((fs: 'normal' | 'large' | 'xl') => {
    setState(s => ({ ...s, fontSize: fs }))
  }, [])

  const exit = useCallback(() => {
    setState(s => ({ ...s, active: false }))
  }, [])

  // Apply presentation CSS to root
  useEffect(() => {
    const root = document.documentElement
    if (state.active) {
      root.setAttribute('data-presentation', state.fontSize)
      root.classList.add('presentation-mode')
    } else {
      root.removeAttribute('data-presentation')
      root.classList.remove('presentation-mode')
    }
  }, [state.active, state.fontSize])

  // Keyboard: Escape or F5 to exit, F to cycle font size
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!state.active) return
      if (e.key === 'Escape' || e.key === 'F5') { e.preventDefault(); exit() }
      if (e.key === 'f' && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setState(s => ({
          ...s,
          fontSize: s.fontSize === 'normal' ? 'large' : s.fontSize === 'large' ? 'xl' : 'normal'
        }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.active, exit])

  return { ...state, toggle, exit, setFontSize }
}

// ── Floating controls for presentation mode ───────────────────────────────────
export function PresentationControls({ fontSize, setFontSize, onExit }: {
  fontSize: 'normal' | 'large' | 'xl'
  setFontSize: (fs: 'normal' | 'large' | 'xl') => void
  onExit: () => void
}) {
  const [visible, setVisible] = useState(true)
  const [lastMouse, setLastMouse] = useState(Date.now())

  useEffect(() => {
    const handler = () => { setLastMouse(Date.now()); setVisible(true) }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - lastMouse > 3000) setVisible(false)
    }, 500)
    return () => clearInterval(t)
  }, [lastMouse])

  return (
    <div className="fixed bottom-6 left-1/2 z-[200] flex items-center gap-2 -translate-x-1/2 transition-all"
         style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
           style={{ background: 'rgba(0,0,0,0.80)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <Monitor size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2 }}>APRESENTAÇÃO</span>
        <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        {/* Font size */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
          {(['normal','large','xl'] as const).map(fs => (
            <button key={fs} onClick={() => setFontSize(fs)}
                    className="px-2.5 py-1 text-xs transition-all"
                    style={{ background: fontSize === fs ? 'rgba(255,255,255,0.18)' : 'transparent', color: fontSize === fs ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {fs === 'normal' ? 'A' : fs === 'large' ? 'A+' : 'A++'}
            </button>
          ))}
        </div>
        <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Esc para sair</span>
        <button onClick={onExit} className="w-6 h-6 rounded-lg flex items-center justify-center ml-1 transition-all hover:scale-110"
                style={{ background: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Entry button shown in sidebar ─────────────────────────────────────────────
export function PresentationButton({ onActivate }: { onActivate: () => void }) {
  return (
    <button onClick={onActivate}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Modo de apresentação — oculta sidebar e nav, aumenta fontes (Ctrl+Shift+P)"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
      <Monitor size={13} />
      <span>Apresentação</span>
      <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
        ⇧P
      </span>
    </button>
  )
}
