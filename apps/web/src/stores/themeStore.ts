import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

export const DARK_THEMES = ['padrao', 'oceano', 'floresta', 'crepusculo', 'rosa', 'cyberpunk', 'mono'] as const
export const LIGHT_THEMES = ['light-padrao', 'light-oceano', 'light-floresta'] as const

export type DarkTheme = (typeof DARK_THEMES)[number]
export type LightTheme = (typeof LIGHT_THEMES)[number]
export type Theme = DarkTheme | LightTheme

const DARK_LABELS: Record<DarkTheme, string> = {
  padrao: 'Padrão', oceano: 'Oceano', floresta: 'Floresta',
  crepusculo: 'Crepúsculo', rosa: 'Rosa', cyberpunk: 'Cyberpunk', mono: 'Mono',
}
const LIGHT_LABELS: Record<LightTheme, string> = {
  'light-padrao': 'Padrão', 'light-oceano': 'Oceano', 'light-floresta': 'Floresta',
}

interface ThemeState {
  theme: Theme
  mode: ThemeMode
  liteMode: boolean
  themeLabel: string
  themeIndex: string

  setTheme: (theme: Theme) => void
  setMode: (mode: ThemeMode) => void
  cycleTheme: () => void
  toggleLiteMode: () => void
}

function applyTheme(theme: Theme, lite: boolean) {
  document.documentElement.setAttribute('data-theme', theme)
  if (lite) {
    document.documentElement.setAttribute('data-lite', '1')
  } else {
    document.documentElement.removeAttribute('data-lite')
  }
  localStorage.setItem('dasitheme', theme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'padrao',
      mode: 'dark',
      liteMode: false,
      themeLabel: 'Padrão',
      themeIndex: '1/7',

      setTheme(theme) {
        const isDark = (DARK_THEMES as readonly string[]).includes(theme)
        const mode: ThemeMode = isDark ? 'dark' : 'light'
        const list = isDark ? DARK_THEMES : LIGHT_THEMES
        const idx = list.indexOf(theme as never)
        const label = isDark
          ? DARK_LABELS[theme as DarkTheme]
          : LIGHT_LABELS[theme as LightTheme]
        const themeIndex = `${idx + 1}/${list.length}`

        applyTheme(theme, get().liteMode)
        set({ theme, mode, themeLabel: label, themeIndex })
      },

      setMode(mode) {
        const current = get().theme
        const isDark = (DARK_THEMES as readonly string[]).includes(current)

        if (mode === 'dark' && !isDark) {
          get().setTheme('padrao')
        } else if (mode === 'light' && isDark) {
          get().setTheme('light-padrao')
        }
        set({ mode })
      },

      cycleTheme() {
        const { theme, mode } = get()
        const list = mode === 'dark' ? DARK_THEMES : LIGHT_THEMES
        const idx = list.indexOf(theme as never)
        const next = list[(idx + 1) % list.length]!
        get().setTheme(next)
      },

      toggleLiteMode() {
        const next = !get().liteMode
        if (next) {
          document.documentElement.setAttribute('data-lite', '1')
          localStorage.setItem('dasiLiteMode', '1')
        } else {
          document.documentElement.removeAttribute('data-lite')
          localStorage.removeItem('dasiLiteMode')
        }
        set({ liteMode: next })
      },
    }),
    {
      name: 'dasiboard-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.liteMode)
      },
    },
  ),
)
