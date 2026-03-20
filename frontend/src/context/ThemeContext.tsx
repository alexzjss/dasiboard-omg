import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId =
  | 'dark-roxo'
  | 'dark-hypado'
  | 'dark-aranha'
  | 'dark-minas'
  | 'dark-dlc'
  | 'dark-shell'
  | 'light-roxo'
  | 'light-sintetizado'
  | 'light-grace'
  | 'light-lab'

export interface ThemeMeta {
  id: ThemeId
  name: string
  dark: boolean
  emoji: string
  description: string
}

export const THEMES: ThemeMeta[] = [
  // Dark
  { id: 'dark-roxo',        name: 'Dark',        dark: true,  emoji: '🔮', description: 'Roxo profundo' },
  { id: 'dark-hypado',      name: 'Hypado',       dark: true,  emoji: '🌆', description: 'Vaporwave · Roxo & Laranja' },
  { id: 'dark-aranha',      name: 'Aranha',       dark: true,  emoji: '🕷️', description: 'Ultimate Spider-Man' },
  { id: 'dark-minas',       name: 'Minas',        dark: true,  emoji: '🦕', description: 'Dinos & Máquinas' },
  { id: 'dark-dlc',         name: 'DLC',          dark: true,  emoji: '🎮', description: 'RGB Gaming' },
  { id: 'dark-shell',       name: 'Shell',        dark: true,  emoji: '💀', description: 'CLI · Matrix' },
  // Light
  { id: 'light-roxo',       name: 'Light',        dark: false, emoji: '☀️', description: 'Roxo suave' },
  { id: 'light-sintetizado',name: 'Sintetizado',  dark: false, emoji: '💠', description: 'Azul limpo' },
  { id: 'light-grace',      name: 'Grace',        dark: false, emoji: '🦉', description: 'Bege · Coruja' },
  { id: 'light-lab',        name: 'Laboratório',  dark: false, emoji: '🔬', description: 'Rosa lab' },
]

const DARK_THEMES  = THEMES.filter(t => t.dark)
const LIGHT_THEMES = THEMES.filter(t => !t.dark)

interface ThemeCtx {
  theme: ThemeMeta
  isDark: boolean
  cycleTheme: () => void
  toggleDarkLight: () => void
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: THEMES[0],
  isDark: true,
  cycleTheme: () => {},
  toggleDarkLight: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    (localStorage.getItem('dasiboard-theme') as ThemeId) ?? 'dark-roxo'
  )

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const isDark = theme.dark

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', themeId)
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')
    localStorage.setItem('dasiboard-theme', themeId)
  }, [themeId, isDark])

  const cycleTheme = () => {
    const pool = isDark ? DARK_THEMES : LIGHT_THEMES
    const idx  = pool.findIndex(t => t.id === themeId)
    setThemeId(pool[(idx + 1) % pool.length].id)
  }

  const toggleDarkLight = () => {
    setThemeId(isDark ? 'light-roxo' : 'dark-roxo')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, cycleTheme, toggleDarkLight, setTheme: setThemeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
