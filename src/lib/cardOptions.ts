// Catálogo da carta de perfil. Precisa ficar com os mesmos ids de server/social/cardOptions.ts
// (o teste server/social/cardOptions.test.ts garante). Os ids de entidade são os de features/entidades/data.ts.

export type CardPalette = { id: string; name: string; accent: string; accent2: string; backdrop: string }

export const CARD_PALETTES = [
  { id: 'coral', name: 'Coral', accent: '#e24a2b', accent2: '#f29a4a', backdrop: '#3a1810' },
  { id: 'ocean', name: 'Oceano', accent: '#1d6fb8', accent2: '#4fc3d9', backdrop: '#0e2a45' },
  { id: 'forest', name: 'Floresta', accent: '#2f7d4f', accent2: '#9bd36b', backdrop: '#12301f' },
  { id: 'grape', name: 'Uva', accent: '#7a3fb5', accent2: '#d08bf0', backdrop: '#26123d' },
  { id: 'ink', name: 'Nanquim', accent: '#2b2f3a', accent2: '#8a93a8', backdrop: '#0f1118' },
  { id: 'sun', name: 'Sol', accent: '#d99a00', accent2: '#ffd75e', backdrop: '#3d2c05' },
  { id: 'mint', name: 'Menta', accent: '#1f9d8a', accent2: '#8fe8c8', backdrop: '#0d3030' },
  { id: 'rose', name: 'Rosa', accent: '#d6457a', accent2: '#ffa3c4', backdrop: '#3d1226' },
  { id: 'neon', name: 'Neon', accent: '#12d6a0', accent2: '#7cff4f', backdrop: '#04140f' },
  { id: 'aurora', name: 'Aurora', accent: '#5b6cff', accent2: '#4fe0c0', backdrop: '#0b1038' },
  { id: 'ouro', name: 'Ouro', accent: '#b8860b', accent2: '#ffe08a', backdrop: '#2a1f04' },
  { id: 'ent-dasi', name: 'DASI', accent: '#5b21b6', accent2: '#a78bfa', backdrop: '#1a1030' },
  { id: 'ent-codelab', name: 'CodeLab Leste', accent: '#ec4899', accent2: '#f9a8d4', backdrop: '#3a1030' },
  { id: 'ent-hype', name: 'Hype USP', accent: '#f59e42', accent2: '#fcd9a0', backdrop: '#3a2208' },
  { id: 'ent-sintese', name: 'Síntese Jr.', accent: '#2563eb', accent2: '#7fb0ff', backdrop: '#0c1c45' },
  { id: 'ent-cossi', name: 'COSSI', accent: '#8b5cf6', accent2: '#c9b3ff', backdrop: '#201040' },
  { id: 'ent-petsi', name: 'PET-SI', accent: '#9f1239', accent2: '#e0607f', backdrop: '#33081a' },
  { id: 'ent-eachintheshell', name: 'Each in The Shell', accent: '#c2410c', accent2: '#fb923c', backdrop: '#33150a' },
  { id: 'ent-conway', name: 'Conway USP', accent: '#8b7ad9', accent2: '#d4ccff', backdrop: '#1d1840' },
] as const satisfies readonly CardPalette[]

export const CARD_PAPERS = ['cream', 'white', 'dark'] as const
export const CARD_SHAPES = ['leaf', 'arch', 'circle', 'squircle'] as const
export const CARD_FINISHES = ['common', 'foil', 'holo', 'gold'] as const
export const MAX_CARD_ITEMS = 4

export type CardPaletteId = (typeof CARD_PALETTES)[number]['id']
export type CardPaper = (typeof CARD_PAPERS)[number]
export type CardShape = (typeof CARD_SHAPES)[number]
export type CardFinish = (typeof CARD_FINISHES)[number]

export type CardSettings = {
  palette: CardPaletteId
  paper: CardPaper
  shape: CardShape
  frame: boolean
  grain: boolean
  finish: CardFinish
  /** entityIds, máx 4; a 1ª é a "principal" do subtítulo. */
  entities: string[]
  /** `${kind}:${sourceId}`, máx 4. */
  badges: string[]
  techOrder: 'profile'
}

export const DEFAULT_CARD: CardSettings = {
  palette: 'coral', paper: 'cream', shape: 'leaf', frame: false, grain: true, finish: 'common', entities: [], badges: [], techOrder: 'profile',
}

export const paletteOf = (id: string): (typeof CARD_PALETTES)[number] => CARD_PALETTES.find((palette) => palette.id === id) ?? CARD_PALETTES[0]
