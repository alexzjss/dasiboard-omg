// ── Scroll Restoration — save/restore scroll position per route ───────────────
import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

const SCROLL_KEY = (path: string) => `dasiboard-scroll${path.replace(/\//g, '-')}`

export function useScrollRestoration(containerRef?: RefObject<HTMLElement>) {
  const { pathname } = useLocation()
  const prevPath     = useRef(pathname)

  // Save scroll when leaving a page
  useEffect(() => {
    const key = SCROLL_KEY(prevPath.current)
    const el  = containerRef?.current ?? document.querySelector('main') ?? window
    const pos = el instanceof Window ? window.scrollY : (el as HTMLElement).scrollTop
    if (pos > 0) sessionStorage.setItem(key, String(pos))
    prevPath.current = pathname
  }, [pathname])

  // Restore scroll when entering a page
  useEffect(() => {
    const key  = SCROLL_KEY(pathname)
    const saved = sessionStorage.getItem(key)
    if (!saved) return
    const pos = parseInt(saved, 10)
    // Small delay so the DOM has painted
    const t = setTimeout(() => {
      const el = containerRef?.current ?? document.querySelector('main') ?? window
      if (el instanceof Window) window.scrollTo({ top: pos, behavior: 'instant' })
      else (el as HTMLElement).scrollTop = pos
    }, 80)
    return () => clearTimeout(t)
  }, [pathname])
}
