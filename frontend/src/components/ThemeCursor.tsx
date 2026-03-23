// ── Custom Cursor by Theme ────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// Themes that get a custom cursor
const CURSOR_THEMES: Record<string, 'pixel' | 'crosshair' | 'glow' | 'nerv'> = {
  'light-blueprint': 'crosshair',
  'light-vidro':     'glow',
  'dark-eva':        'nerv',
}

// Pixel cursor — 16x16 pixelated arrow
function makePixelCursorSVG(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <polygon points="2,2 2,14 5,11 7,15 9,14 7,10 11,10" fill="#ffcc00" stroke="#000" stroke-width="1"/>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 2 2, auto`
}

// Crosshair cursor — Blueprint style
function makeCrosshairSVG(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" fill="none" stroke="#4499ff" stroke-width="1" opacity="0.8"/>
    <line x1="12" y1="2" x2="12" y2="8" stroke="#4499ff" stroke-width="1.5"/>
    <line x1="12" y1="16" x2="12" y2="22" stroke="#4499ff" stroke-width="1.5"/>
    <line x1="2" y1="12" x2="8" y2="12" stroke="#4499ff" stroke-width="1.5"/>
    <line x1="16" y1="12" x2="22" y2="12" stroke="#4499ff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="1.5" fill="#4499ff"/>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`
}

// NERV cursor — Eva hex reticle
function makeNervCursorSVG(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <polygon points="14,2 22,7 22,21 14,26 6,21 6,7" fill="none" stroke="#aaff00" stroke-width="1" opacity="0.9"/>
    <line x1="14" y1="2" x2="14" y2="8" stroke="#aaff00" stroke-width="1.5"/>
    <line x1="14" y1="20" x2="14" y2="26" stroke="#aaff00" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="2" fill="#aaff00" opacity="0.9"/>
    <circle cx="14" cy="14" r="5" fill="none" stroke="#8b00ff" stroke-width="0.5" opacity="0.6"/>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 14 14, crosshair`
}

// Glow cursor — Vidro glass effect (CSS-only via canvas overlay)
export function GlowCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isVidro = theme.id === 'light-vidro'

  useEffect(() => {
    if (!isVidro) return
    const el = cursorRef.current
    if (!el) return

    const move = (e: PointerEvent) => {
      el.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`
      el.style.opacity = '1'
    }
    const leave = () => { if (el) el.style.opacity = '0' }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerleave', leave)
    }
  }, [isVidro])

  if (!isVidro) return null

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: 32, height: 32,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,180,255,0.6) 0%, rgba(170,90,255,0.3) 50%, transparent 70%)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: 0,
        transition: 'opacity 0.15s',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  )
}

export function ThemeCursorStyle() {
  const { theme } = useTheme()
  const cursorType = CURSOR_THEMES[theme.id]

  useEffect(() => {
    if (!cursorType || cursorType === 'glow') {
      document.documentElement.style.cursor = ''
      return
    }
    let cursorValue = ''
    if (cursorType === 'pixel')      cursorValue = makePixelCursorSVG()
    if (cursorType === 'crosshair')  cursorValue = makeCrosshairSVG()
    if (cursorType === 'nerv')       cursorValue = makeNervCursorSVG()
    document.documentElement.style.cursor = cursorValue
    return () => { document.documentElement.style.cursor = '' }
  }, [cursorType])

  return null
}
