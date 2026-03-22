import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

export type ThemeId =
  | 'dark-roxo' | 'dark-hypado' | 'dark-minas' | 'dark-dlc' | 'dark-shell'
  | 'dark-colina' | 'dark-pixel' | 'light-720' | 'light-blueprint'
  | 'dark-holo' | 'dark-vinganca' | 'dark-eva'
  | 'light-roxo' | 'light-aranha' | 'light-sintetizado' | 'light-grace'
  | 'light-lab' | 'light-ilha' | 'light-vidro' | 'light-vanilla'
  | 'light-punkrock' | 'light-memento'
  | 'dark-chrono'
  | 'light-portatil'
  | 'dark-aqua'

// Sub-eras do Chrono Trigger que rotacionam por página
export type ChronoEra = 'prehistoria' | 'antiguidade' | 'era-media' | 'futuro' | 'fim-dos-tempos'
export const CHRONO_ERAS: ChronoEra[] = ['prehistoria', 'antiguidade', 'era-media', 'futuro', 'fim-dos-tempos']
export const CHRONO_ERA_LABELS: Record<ChronoEra, string> = {
  'prehistoria':    '65000000 A.C. · Pré-história',
  'antiguidade':    '12000 A.C. · Era das Trevas',
  'era-media':      '600 D.C. · Era Média',
  'futuro':         '2300 D.C. · Futuro Sombrio',
  'fim-dos-tempos': '∞ · Fim dos Tempos',
}
export const CHRONO_ERA_EMOJI: Record<ChronoEra, string> = {
  'prehistoria':    '🦕',
  'antiguidade':    '🏔️',
  'era-media':      '🏰',
  'futuro':         '🤖',
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
  // Escuros
  { id: 'dark-roxo',        name: 'Dark',        dark: true,  emoji: '🔮', description: 'Roxo profundo',             group: 'base'    },
  { id: 'dark-hypado',      name: 'Hypado',       dark: true,  emoji: '🌆', description: 'Vaporwave · Synthwave',      group: 'vibes'   },
  { id: 'dark-minas',       name: 'Minas',        dark: true,  emoji: '🦕', description: 'Dinos & Máquinas',          group: 'vibes'   },
  { id: 'dark-dlc',         name: 'DLC',          dark: true,  emoji: '🕹️', description: 'RGB Gaming',                group: 'games'   },
  { id: 'dark-shell',       name: 'Shell',        dark: true,  emoji: '💀', description: 'CLI · Matrix',              group: 'tech'    },
  { id: 'dark-colina',      name: 'Colina',       dark: true,  emoji: '🌫️', description: 'Silent Hill · Névoa',       group: 'vibes'   },
  { id: 'dark-pixel',       name: 'Pixel',        dark: true,  emoji: '👾', description: 'SNES · NES · Pixel Art',    group: 'games'   },
  { id: 'light-720',        name: '720',          dark: true,  emoji: '🎮', description: 'Xbox 360 · Verde',          group: 'games'   },
  { id: 'light-blueprint',  name: 'Blueprint',    dark: true,  emoji: '📐', description: 'Plantas Técnicas',          group: 'tech'    },
  { id: 'dark-holo',        name: 'Holográfico',  dark: true,  emoji: '🌈', description: 'Iridescente · Prisma',      group: 'special' },
  { id: 'dark-vinganca',    name: 'Vingança',     dark: true,  emoji: '🦇', description: 'Batman TAS · Noir',         group: 'super'   },
  { id: 'dark-eva',         name: 'Eva',          dark: true,  emoji: '🤖', description: 'Evangelion · NERV',         group: 'anime'   },
  { id: 'dark-chrono',      name: 'Chrono',       dark: true,  emoji: '⌛', description: 'Chrono Trigger · Eras',    group: 'special' },
  // Claros
  { id: 'light-roxo',       name: 'Light',        dark: false, emoji: '☀️', description: 'Roxo suave',                group: 'base'    },
  { id: 'light-aranha',     name: 'Aranha',       dark: false, emoji: '🕷️', description: 'HQ · Vermelho & Azul',     group: 'super'   },
  { id: 'light-sintetizado',name: 'Sintetizado',  dark: false, emoji: '💠', description: 'Azul limpo',                group: 'base'    },
  { id: 'light-grace',      name: 'Grace',        dark: false, emoji: '🦉', description: 'Bege editorial · Coruja',   group: 'vibes'   },
  { id: 'light-lab',        name: 'Laboratório',  dark: false, emoji: '🖥️', description: 'Y2K Pink · Lime',          group: 'tech'    },
  { id: 'light-ilha',       name: 'Ilha',         dark: false, emoji: '🏝️', description: 'Kingdom Hearts · Sol',     group: 'games'   },
  { id: 'light-vidro',      name: 'Vidro',        dark: false, emoji: '🔮', description: 'Glassmorphism',             group: 'special' },
  { id: 'light-vanilla',    name: 'Vanilla',      dark: false, emoji: '🍦', description: 'Bege elegante · Minimal',   group: 'base'    },
  { id: 'light-punkrock',   name: 'Punkrock',     dark: false, emoji: '🦸', description: 'Superman · Azul & Vermelho',group: 'super'   },
  { id: 'light-memento',    name: 'Memento',      dark: false, emoji: '🃏', description: 'Persona · Editorial',       group: 'anime'   },
  { id: 'light-portatil',   name: 'Portátil',     dark: false, emoji: '🎮', description: 'Game Boy · Verde acinzentado', group: 'games' },
  { id: 'dark-aqua',        name: 'Aqua',         dark: true,  emoji: '💧', description: 'Windows XP Luna · Azul vitrificado', group: 'special' },
]

export const DARK_THEMES  = THEMES.filter(t => t.dark)
export const LIGHT_THEMES = THEMES.filter(t => !t.dark)
export const THEME_GROUPS: Record<string, string> = {
  base: 'Essenciais', vibes: 'Atmosfera', tech: 'Tech',
  games: 'Games', super: 'Super-heróis', anime: 'Anime', special: 'Especial',
}

interface ThemeCtx {
  theme: ThemeMeta
  isDark: boolean
  cycleTheme: () => void
  toggleDarkLight: () => void
  setTheme: (id: ThemeId) => void
  chronoEra: ChronoEra | null
}

const ThemeContext = createContext<ThemeCtx>({
  theme: THEMES[0], isDark: true,
  cycleTheme: () => {}, toggleDarkLight: () => {}, setTheme: () => {},
  chronoEra: null,
})

// Sorteia era aleatória mas diferente da atual
function pickEra(current: ChronoEra | null): ChronoEra {
  const options = current ? CHRONO_ERAS.filter(e => e !== current) : CHRONO_ERAS
  return options[Math.floor(Math.random() * options.length)]
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    (localStorage.getItem('dasiboard-theme') as ThemeId) ?? 'dark-roxo'
  )
  const [chronoEra, setChronoEra] = useState<ChronoEra | null>(null)

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const isDark = theme.dark
  const isChrono = themeId === 'dark-chrono'

  // Aplica o data-theme e data-chrono-era no HTML
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', themeId)
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')
    localStorage.setItem('dasiboard-theme', themeId)

    if (isChrono && !chronoEra) {
      const era = pickEra(null)
      setChronoEra(era)
      root.setAttribute('data-chrono-era', era)
    }
    if (!isChrono) {
      setChronoEra(null)
      root.removeAttribute('data-chrono-era')
    }
  }, [themeId, isDark, isChrono])

  // Troca de era ao navegar (só no tema Chrono)
  const rotateChronoEra = useCallback(() => {
    if (!isChrono) return
    const next = pickEra(chronoEra)
    setChronoEra(next)
    document.documentElement.setAttribute('data-chrono-era', next)
    // Emit event so audio hook can play portal sound
    document.dispatchEvent(new CustomEvent('chrono:era-change', { detail: { era: next } }))
  }, [isChrono, chronoEra])

  const cycleTheme = () => {
    const pool = isDark ? DARK_THEMES : LIGHT_THEMES
    const idx  = pool.findIndex(t => t.id === themeId)
    setThemeId(pool[(idx + 1) % pool.length].id)
  }
  const toggleDarkLight = () => setThemeId(isDark ? 'light-roxo' : 'dark-roxo')

  return (
    <ThemeContext.Provider value={{ theme, isDark, cycleTheme, toggleDarkLight, setTheme: setThemeId, chronoEra }}>
      <ChronoRouteWatcher isChrono={isChrono} rotate={rotateChronoEra} />
      {children}
    </ThemeContext.Provider>
  )
}

// Componente interno que escuta as rotas e rotaciona a era
function ChronoRouteWatcher({ isChrono, rotate }: { isChrono: boolean; rotate: () => void }) {
  const location = useLocation()
  useEffect(() => {
    if (isChrono) rotate()
  }, [location.pathname])
  return null
}

export const useTheme = () => useContext(ThemeContext)
