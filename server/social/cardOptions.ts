// Catálogo da carta de perfil. Precisa ficar com os mesmos ids de src/lib/cardOptions.ts
// (o teste cardOptions.test.ts garante). Os ids de entidade são os de src/features/entidades/data.ts.

export const CARD_BASE_PALETTES = ['coral', 'ocean', 'forest', 'grape', 'ink', 'sun', 'mint', 'rose'] as const
export const CARD_SPECIAL_PALETTES = ['neon', 'aurora', 'ouro'] as const
export const CARD_ENTITY_NAMES = {
  dasi: 'DASI',
  codelab: 'CodeLab Leste',
  hype: 'Hype USP',
  sintese: 'Síntese Jr.',
  cossi: 'COSSI',
  petsi: 'PET-SI',
  eachintheshell: 'Each in The Shell',
  conway: 'Conway USP',
} as const

export type CardEntitySuffix = keyof typeof CARD_ENTITY_NAMES
export type CardPaletteId = (typeof CARD_BASE_PALETTES)[number] | (typeof CARD_SPECIAL_PALETTES)[number] | `ent-${CardEntitySuffix}`

export const CARD_ENTITY_PALETTES = (Object.keys(CARD_ENTITY_NAMES) as CardEntitySuffix[]).map((id) => `ent-${id}` as const)
export const CARD_PALETTE_IDS: readonly CardPaletteId[] = [...CARD_BASE_PALETTES, ...CARD_SPECIAL_PALETTES, ...CARD_ENTITY_PALETTES]
export const CARD_PAPERS = ['cream', 'white', 'dark'] as const
export const CARD_SHAPES = ['leaf', 'arch', 'circle', 'squircle'] as const
export const CARD_FINISHES = ['common', 'foil', 'holo', 'gold'] as const
export const MAX_CARD_ITEMS = 4

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
  entities: string[] // entityIds, máx 4; a 1ª é a "principal" do subtítulo
  badges: string[] // `${kind}:${sourceId}`, máx 4
  techOrder: 'profile'
}

export const DEFAULT_CARD: CardSettings = {
  palette: 'coral', paper: 'cream', shape: 'leaf', frame: false, grain: true, finish: 'common', entities: [], badges: [], techOrder: 'profile',
}

export const isCardPalette = (value: unknown): value is CardPaletteId => typeof value === 'string' && (CARD_PALETTE_IDS as readonly string[]).includes(value)
export const isCardPaper = (value: unknown): value is CardPaper => (CARD_PAPERS as readonly unknown[]).includes(value)
export const isCardShape = (value: unknown): value is CardShape => (CARD_SHAPES as readonly unknown[]).includes(value)
export const isCardFinish = (value: unknown): value is CardFinish => (CARD_FINISHES as readonly unknown[]).includes(value)

// Lê o jsonb salvo: junta com o padrão e descarta em silêncio o que não vale (chave ou valor desconhecido).
export function mergeCard(raw: unknown): CardSettings {
  const source = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const list = (value: unknown) => (Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))].slice(0, MAX_CARD_ITEMS) : [])
  return {
    palette: isCardPalette(source.palette) ? source.palette : DEFAULT_CARD.palette,
    paper: isCardPaper(source.paper) ? source.paper : DEFAULT_CARD.paper,
    shape: isCardShape(source.shape) ? source.shape : DEFAULT_CARD.shape,
    frame: typeof source.frame === 'boolean' ? source.frame : DEFAULT_CARD.frame,
    grain: typeof source.grain === 'boolean' ? source.grain : DEFAULT_CARD.grain,
    finish: isCardFinish(source.finish) ? source.finish : DEFAULT_CARD.finish,
    entities: list(source.entities),
    badges: list(source.badges),
    techOrder: 'profile',
  }
}
