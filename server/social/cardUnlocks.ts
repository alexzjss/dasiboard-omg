import { CARD_BASE_PALETTES, CARD_ENTITY_NAMES, type CardEntitySuffix, type CardFinish, type CardPaletteId } from './cardOptions.js'

export type UnlockStats = {
  badgeCount: number // não-entidade, ativas
  hasTitle: boolean
  connections: number
  hasAdminAward: boolean
  collected: number
  entityIds: string[] // membro ativo
}

export type CardUnlocks = { finishes: CardFinish[]; palettes: CardPaletteId[]; requirements: Record<string, string> }

const FOIL = 'Ganhe 5 badges'
const HOLO = 'Tenha um cargo numa entidade ou 25 conexões'
const GOLD = 'Receba uma badge da administração ou colecione 50 cartas'

// Pura: decide o que a pessoa pode usar na carta. O servidor reconfere em todo salvamento.
export function cardUnlocks(s: UnlockStats): CardUnlocks {
  const finishes: CardFinish[] = ['common']
  const palettes: CardPaletteId[] = [...CARD_BASE_PALETTES]
  const requirements: Record<string, string> = {}
  const gate = (ok: boolean, finish: CardFinish, palette: CardPaletteId, text: string) => {
    if (ok) {
      finishes.push(finish)
      palettes.push(palette)
    } else {
      requirements[finish] = text
      requirements[palette] = text
    }
  }
  gate(s.badgeCount >= 5, 'foil', 'neon', FOIL)
  gate(s.hasTitle || s.connections >= 25, 'holo', 'aurora', HOLO)
  gate(s.hasAdminAward || s.collected >= 50, 'gold', 'ouro', GOLD)
  for (const suffix of Object.keys(CARD_ENTITY_NAMES) as CardEntitySuffix[]) {
    const id = `ent-${suffix}` as const
    if (s.entityIds.includes(suffix)) palettes.push(id)
    else requirements[id] = `Entre na entidade ${CARD_ENTITY_NAMES[suffix]}`
  }
  return { finishes, palettes, requirements }
}
