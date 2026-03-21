import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId =
  // ── Escuros ─────────────────────────────────────────────
  | 'dark-roxo'
  | 'dark-hypado'
  | 'dark-minas'
  | 'dark-dlc'
  | 'dark-shell'
  | 'dark-colina'
  | 'dark-pixel'
  | 'light-720'        // dark apesar do prefixo (Xbox 360)
  | 'light-blueprint'  // dark apesar do prefixo (fundo azul escuro)
  // ── Escuros novos ────────────────────────────────────────
  | 'dark-holo'
  | 'dark-vinganca'
  | 'dark-eva'
  // ── Claros ──────────────────────────────────────────────
  | 'light-roxo'
  | 'light-aranha'
  | 'light-sintetizado'
  | 'light-grace'
  | 'light-lab'
  | 'light-ilha'
  | 'light-vidro'
  | 'light-vanilla'
  | 'light-lite'
  // ── Claros novos ─────────────────────────────────────────
  | 'light-punkrock'
  | 'light-memento'

export interface ThemeMeta {
  id: ThemeId
  name: string
  dark: boolean
  emoji: string
  description: string
  group?: string  // agrupamento editorial
}

export const THEMES: ThemeMeta[] = [
  // ── Escuros ──────────────────────────────────────────────────────
  { id: 'dark-roxo',       name: 'Dark',        dark: true,  emoji: '🔮', description: 'Roxo profundo',           group: 'base'    },
  { id: 'dark-hypado',     name: 'Hypado',       dark: true,  emoji: '🌆', description: 'Vaporwave · Synthwave',    group: 'vibes'   },
  { id: 'dark-minas',      name: 'Minas',        dark: true,  emoji: '🦕', description: 'Dinos & Máquinas',        group: 'vibes'   },
  { id: 'dark-dlc',        name: 'DLC',          dark: true,  emoji: '🕹️', description: 'RGB Gaming',              group: 'games'   },
  { id: 'dark-shell',      name: 'Shell',        dark: true,  emoji: '💀', description: 'CLI · Matrix',            group: 'tech'    },
  { id: 'dark-colina',     name: 'Colina',       dark: true,  emoji: '🌫️', description: 'Silent Hill · Névoa',     group: 'vibes'   },
  { id: 'dark-pixel',      name: 'Pixel',        dark: true,  emoji: '👾', description: 'SNES · NES · Pixel Art',  group: 'games'   },
  { id: 'light-720',       name: '720',          dark: true,  emoji: '🎮', description: 'Xbox 360 · Verde',        group: 'games'   },
  { id: 'light-blueprint', name: 'Blueprint',    dark: true,  emoji: '📐', description: 'Plantas Técnicas',        group: 'tech'    },
  // Escuros novos
  { id: 'dark-holo',       name: 'Holográfico',  dark: true,  emoji: '🌈', description: 'Iridescente · Prisma',    group: 'special' },
  { id: 'dark-vinganca',   name: 'Vingança',     dark: true,  emoji: '🦇', description: 'Batman TAS · Noir',       group: 'super'   },
  { id: 'dark-eva',        name: 'Eva',          dark: true,  emoji: '🤖', description: 'Evangelion · NERV',       group: 'anime'   },
  // ── Claros ───────────────────────────────────────────────────────
  { id: 'light-roxo',      name: 'Light',        dark: false, emoji: '☀️', description: 'Roxo suave',              group: 'base'    },
  { id: 'light-aranha',    name: 'Aranha',       dark: false, emoji: '🕷️', description: 'HQ · Vermelho & Azul',   group: 'super'   },
  { id: 'light-sintetizado',name:'Sintetizado',  dark: false, emoji: '💠', description: 'Azul limpo',              group: 'base'    },
  { id: 'light-grace',     name: 'Grace',        dark: false, emoji: '🦉', description: 'Bege editorial · Coruja', group: 'vibes'   },
  { id: 'light-lab',       name: 'Laboratório',  dark: false, emoji: '🖥️', description: 'Y2K Pink · Lime',        group: 'tech'    },
  { id: 'light-ilha',      name: 'Ilha',         dark: false, emoji: '🏝️', description: 'Kingdom Hearts · Sol',   group: 'games'   },
  { id: 'light-vidro',     name: 'Vidro',        dark: false, emoji: '🔮', description: 'Glassmorphism',           group: 'special' },
  { id: 'light-vanilla',   name: 'Vanilla',      dark: false, emoji: '🍦', description: 'Bege elegante · Minimal', group: 'base'    },
  { id: 'light-lite',      name: 'Lite',         dark: false, emoji: '✨', description: 'Leve · Sem efeitos',      group: 'base'    },
  // Claros novos
  { id: 'light-punkrock',  name: 'Punkrock',     dark: false, emoji: '🦸', description: 'Superman · Azul & Vermelho', group: 'super' },
  { id: 'light-memento',   name: 'Memento',      dark: false, emoji: '🃏', description: 'Persona · Editorial',     group: 'anime'   },
]

export const DARK_THEMES  = THEMES.filter(t => t.dark)
export const LIGHT_THEMES = THEMES.filter(t => !t.dark)

// Agrupamentos para o picker
export const THEME_GROUPS: Record<string, string> = {
  base:    'Essenciais',
  vibes:   'Atmosfera',
  tech:    'Tech',
  games:   'Games',
  super:   'Super-heróis',
  anime:   'Anime',
  special: 'Especial',
}

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
