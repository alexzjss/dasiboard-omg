import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId =
  | 'dark-roxo'
  | 'dark-hypado'
  | 'dark-aranha'
  | 'light-grifinho'
  | 'light-sintetizado'
  | 'light-minas'

export interface ThemeMeta {
  id: ThemeId
  name: string
  dark: boolean
  emoji: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'dark-roxo',           name: 'Roxo',        dark: true,  emoji: '🔮' },
  { id: 'dark-hypado',         name: 'Hypado',       dark: true,  emoji: '🧮' },
  { id: 'dark-aranha',         name: 'Aranha',       dark: true,  emoji: '🕷️' },
  { id: 'light-grifinho',      name: 'Grifinho',     dark: false, emoji: '🦁' },
  { id: 'light-sintetizado',   name: 'Sintetizado',  dark: false, emoji: '💠' },
  { id: 'light-minas',         name: 'Minas',        dark: false, emoji: '🌸' },
]

interface ThemeCtx {
  theme: ThemeMeta
  isDark: boolean
  cycleTheme: () => void
  toggleDarkLight: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: THEMES[0],
  isDark: true,
  cycleTheme: () => {},
  toggleDarkLight: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    return (localStorage.getItem('dasiboard-theme') as ThemeId) ?? 'dark-roxo'
  })

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
  const isDark = theme.dark

  useEffect(() => {
    const root = document.documentElement
    // Remove all theme attrs
    THEMES.forEach((t) => root.removeAttribute('data-theme'))
    root.setAttribute('data-theme', themeId)
    // Also set dark/light class for tailwind
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')
    localStorage.setItem('dasiboard-theme', themeId)
  }, [themeId, isDark])

  const cycleTheme = () => {
    const darkThemes  = THEMES.filter((t) => t.dark)
    const lightThemes = THEMES.filter((t) => !t.dark)
    const pool = isDark ? darkThemes : lightThemes
    const idx  = pool.findIndex((t) => t.id === themeId)
    const next = pool[(idx + 1) % pool.length]
    setThemeId(next.id)
  }

  const toggleDarkLight = () => {
    if (isDark) {
      // switch to first light theme
      setThemeId('light-grifinho')
    } else {
      // switch to first dark theme
      setThemeId('dark-roxo')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, cycleTheme, toggleDarkLight }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
