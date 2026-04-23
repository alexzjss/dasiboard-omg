import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

export type ThemeId = string
export type ChronoEra = 'prehistoria' | 'antiguidade' | 'era-media' | 'futuro' | 'fim-dos-tempos'
export const CHRONO_ERAS: ChronoEra[] = ['prehistoria', 'antiguidade', 'era-media', 'futuro', 'fim-dos-tempos']
export const CHRONO_ERA_LABELS: Record<ChronoEra, string> = {
  'prehistoria': '65000000 A.C. · Pré-história',
  'antiguidade': '12000 A.C. · Era das Trevas',
  'era-media': '600 D.C. · Era Média',
  'futuro': '2300 D.C. · Futuro Sombrio',
  'fim-dos-tempos': '∞ · Fim dos Tempos',
}
export const CHRONO_ERA_EMOJI: Record<ChronoEra, string> = {
  'prehistoria': '🦕',
  'antiguidade': '🏔️',
  'era-media': '🏰',
  'futuro': '🤖',
  'fim-dos-tempos': '⌛',
}

export interface ThemeMeta {
  id: ThemeId
  name: string
  dark: boolean
  emoji: string
  description: string
  group?: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'custom-dark', name: 'Escuro', dark: true, emoji: '🌙', description: 'Modo escuro com destaque customizável', group: 'base' },
  { id: 'custom-light', name: 'Claro', dark: false, emoji: '☀️', description: 'Modo claro com destaque customizável', group: 'base' },
]
export const DARK_THEMES = THEMES.filter(t => t.dark)
export const LIGHT_THEMES = THEMES.filter(t => !t.dark)
export const THEME_GROUPS: Record<string, string> = { base: 'Essenciais' }

type ThemeMode = 'light' | 'dark'

interface ThemeCtx {
  theme: ThemeMeta
  isDark: boolean
  accentColor: string
  cycleTheme: () => void
  toggleDarkLight: () => void
  setTheme: (id: ThemeId) => void
  setAccentColor: (color: string) => void
  chronoEra: ChronoEra | null
}

const DEFAULT_ACCENT = '#7c3aed'
const STORAGE_KEY = 'dasiboard-theme-v2'
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

function normalizeColor(value: string): string {
  const c = value.trim().toLowerCase()
  return HEX_COLOR_RE.test(c) ? c : DEFAULT_ACCENT
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = normalizeColor(hex).slice(1)
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamped = [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))))
  return `#${clamped.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const ThemeContext = createContext<ThemeCtx>({
  theme: THEMES[0],
  isDark: true,
  accentColor: DEFAULT_ACCENT,
  cycleTheme: () => {},
  toggleDarkLight: () => {},
  setTheme: () => {},
  setAccentColor: () => {},
  chronoEra: null,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)
  const [mode, setMode] = useState<ThemeMode>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'dark'
    try {
      const parsed = JSON.parse(raw) as { mode?: ThemeMode }
      return parsed.mode === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [accentColor, setAccentColorState] = useState<string>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ACCENT
    try {
      const parsed = JSON.parse(raw) as { accentColor?: string }
      return normalizeColor(parsed.accentColor ?? DEFAULT_ACCENT)
    } catch {
      return DEFAULT_ACCENT
    }
  })
  const [loadedFromServer, setLoadedFromServer] = useState(false)

  const theme = useMemo<ThemeMeta>(
    () => (mode === 'dark' ? THEMES[0] : THEMES[1]),
    [mode]
  )
  const isDark = mode === 'dark'

  const setTheme = (id: ThemeId) => setMode(id === 'custom-light' ? 'light' : 'dark')
  const toggleDarkLight = () => setMode(prev => (prev === 'dark' ? 'light' : 'dark'))
  const cycleTheme = () => toggleDarkLight()
  const setAccentColor = (value: string) => setAccentColorState(normalizeColor(value))

  useEffect(() => {
    const root = document.documentElement
    const accent1 = accentColor
    const accent2 = darken(accentColor, isDark ? 0.18 : 0.25)
    const accent3 = lighten(accentColor, isDark ? 0.25 : 0.1)
    const gradientBtn = `linear-gradient(135deg, ${accent1}, ${accent2})`
    const gradientHero = isDark
      ? `linear-gradient(135deg, ${darken(accentColor, 0.4)} 0%, ${darken(accentColor, 0.6)} 100%)`
      : `linear-gradient(135deg, ${lighten(accentColor, 0.38)} 0%, ${lighten(accentColor, 0.22)} 100%)`

    root.setAttribute('data-theme', isDark ? 'custom-dark' : 'custom-light')
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')

    if (isDark) {
      root.style.setProperty('--bg-base', '#07070f')
      root.style.setProperty('--bg-surface', '#0c0c1a')
      root.style.setProperty('--bg-elevated', '#11112a')
      root.style.setProperty('--bg-card', '#13133a')
      root.style.setProperty('--border', '#1e1e50')
      root.style.setProperty('--border-light', '#2a2a70')
      root.style.setProperty('--text-primary', '#eeeeff')
      root.style.setProperty('--text-secondary', '#b2b2dd')
      root.style.setProperty('--text-muted', '#6d6d9e')
      root.style.setProperty('--noise-opacity', '0.02')
      root.style.setProperty('--card-blur', '0px')
      root.style.setProperty('--sidebar-overlay', 'none')
    } else {
      root.style.setProperty('--bg-base', '#f5f6fb')
      root.style.setProperty('--bg-surface', '#ffffff')
      root.style.setProperty('--bg-elevated', '#eef1f8')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--border', '#d8deea')
      root.style.setProperty('--border-light', '#c6cfdf')
      root.style.setProperty('--text-primary', '#1d2234')
      root.style.setProperty('--text-secondary', '#4d5775')
      root.style.setProperty('--text-muted', '#75809f')
      root.style.setProperty('--noise-opacity', '0.01')
      root.style.setProperty('--card-blur', '0px')
      root.style.setProperty('--sidebar-overlay', 'none')
    }

    root.style.setProperty('--accent-1', accent1)
    root.style.setProperty('--accent-2', accent2)
    root.style.setProperty('--accent-3', accent3)
    root.style.setProperty('--accent-soft', withAlpha(accent1, isDark ? 0.18 : 0.12))
    root.style.setProperty('--accent-glow', withAlpha(accent1, isDark ? 0.3 : 0.18))
    root.style.setProperty('--gradient-btn', gradientBtn)
    root.style.setProperty('--gradient-hero', gradientHero)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accentColor }))
    localStorage.setItem('dasiboard-theme', isDark ? 'custom-dark' : 'custom-light')
  }, [mode, accentColor, isDark])

  useEffect(() => {
    if (!accessToken) {
      setLoadedFromServer(true)
      return
    }
    let alive = true
    api.get('/users/me/theme')
      .then(({ data }) => {
        if (!alive) return
        setMode(data?.mode === 'light' ? 'light' : 'dark')
        setAccentColorState(normalizeColor(data?.accent_color ?? DEFAULT_ACCENT))
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadedFromServer(true)
      })
    return () => { alive = false }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !loadedFromServer) return
    const t = setTimeout(() => {
      api.patch('/users/me/theme', { mode, accent_color: accentColor }).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [accessToken, loadedFromServer, mode, accentColor])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        accentColor,
        cycleTheme,
        toggleDarkLight,
        setTheme,
        setAccentColor,
        chronoEra: null,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
