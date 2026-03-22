// ── Settings hook — fonte, densidade, preferências globais ────────────────────
import { useState, useEffect, useCallback } from 'react'

export type Density = 'compact' | 'comfortable'

interface Settings {
  fontSize:    number    // 12–20, default 14
  density:     Density   // 'compact' | 'comfortable'
  reducedMotion: boolean // override OS preference
}

const DEFAULTS: Settings = { fontSize: 14, density: 'comfortable', reducedMotion: false }
const KEY = 'dasiboard-settings'

function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } }
  catch { return DEFAULTS }
}

// Apply CSS vars to document root
function applySettings(s: Settings) {
  const root = document.documentElement
  root.style.setProperty('--app-font-size', `${s.fontSize}px`)
  root.style.setProperty('--app-density', s.density === 'compact' ? '0.8' : '1')
  root.setAttribute('data-density', s.density)
  if (s.reducedMotion) root.setAttribute('data-reduced-motion', '1')
  else root.removeAttribute('data-reduced-motion')
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Apply on mount
  useEffect(() => { applySettings(loadSettings()) }, [])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(KEY, JSON.stringify(next))
      applySettings(next)
      return next
    })
  }, [])

  return { settings, update }
}
