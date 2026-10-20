// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CARD_FINISHES as FRONT_FINISHES, CARD_PALETTES, CARD_PAPERS as FRONT_PAPERS, CARD_SHAPES as FRONT_SHAPES } from '../../src/lib/cardOptions'
import { entidadesData } from '../../src/features/entidades/data'
import { CARD_ENTITY_NAMES, CARD_FINISHES, CARD_PALETTE_IDS, CARD_PAPERS, CARD_SHAPES } from './cardOptions'
import { cardUnlocks, type UnlockStats } from './cardUnlocks'

const none: UnlockStats = { badgeCount: 0, hasTitle: false, connections: 0, hasAdminAward: false, collected: 0, entityIds: [] }

describe('card catalog', () => {
  it('keeps front and server ids identical', () => {
    expect(CARD_PALETTES.map((p) => p.id).sort()).toEqual([...CARD_PALETTE_IDS].sort())
    expect([...FRONT_PAPERS]).toEqual([...CARD_PAPERS])
    expect([...FRONT_SHAPES]).toEqual([...CARD_SHAPES])
    expect([...FRONT_FINISHES]).toEqual([...CARD_FINISHES])
  })

  it('uses the real entity ids', () => {
    expect(Object.keys(CARD_ENTITY_NAMES).sort()).toEqual(entidadesData.map((e) => e.id).sort())
  })
})

describe('cardUnlocks', () => {
  it('unlocks foil and neon at 5 badges, but not holo', () => {
    const result = cardUnlocks({ ...none, badgeCount: 5 })
    expect(result.finishes).toContain('foil')
    expect(result.palettes).toContain('neon')
    expect(result.finishes).not.toContain('holo')
    expect(result.requirements.holo).toBe('Tenha um cargo numa entidade ou 25 conexões')
    expect(result.requirements.foil).toBeUndefined()
  })

  it('unlocks holo/aurora with a title or 25 connections, gold/ouro with admin award or 50 collected', () => {
    expect(cardUnlocks({ ...none, hasTitle: true }).finishes).toContain('holo')
    expect(cardUnlocks({ ...none, connections: 25 }).palettes).toContain('aurora')
    expect(cardUnlocks({ ...none, hasAdminAward: true }).finishes).toContain('gold')
    expect(cardUnlocks({ ...none, collected: 50 }).palettes).toContain('ouro')
    expect(cardUnlocks(none).requirements.gold).toBe('Receba uma badge da administração ou colecione 50 cartas')
  })

  it('unlocks the entity palette only for members', () => {
    const result = cardUnlocks({ ...none, entityIds: ['dasi'] })
    expect(result.palettes).toContain('ent-dasi')
    expect(result.palettes).not.toContain('ent-petsi')
    expect(result.requirements['ent-petsi']).toBe('Entre na entidade PET-SI')
  })
})
