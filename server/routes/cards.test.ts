// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { anonymous, as } from '../test/helpers.js'
import { DEFAULT_CARD } from '../social/cardOptions.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let n = 0
const student = (name: string) => addPerson({ name, handle: `${name.toLowerCase()}${++n}` })
const settings = (patch: Record<string, unknown> = {}) => ({ ...DEFAULT_CARD, ...patch })
const giveBadges = (userId: string, count: number) => {
  for (let i = 0; i < count; i++) store.badges.push({ user_id: userId, kind: 'achievement', source_id: `a${i}`, label: `B${i}`, revoked_at: null })
}

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
  addEntity('petsi', 'PET-SI')
})

describe('GET /api/cards/:handle', () => {
  it('answers 401 with no data when the card is private and the visitor is anonymous', async () => {
    const ana = student('Ana')
    const res = await anonymous().get(`/api/cards/${ana.handle}`)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Entre para ver esta carta' })
    expect(JSON.stringify(res.body)).not.toContain('Ana')
  })

  it('serves a public card to anonymous visitors without the email', async () => {
    const ana = student('Ana')
    await (await as(ana)).patch('/api/me/card').send({ public: true })
    const res = await anonymous().get(`/api/cards/${ana.handle}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ handle: ana.handle, name: 'Ana', viewer: null })
    expect(JSON.stringify(res.body)).not.toContain(ana.email)
    expect(res.body).not.toHaveProperty('email')
  })

  it('serves a private card to a logged viewer with their relation', async () => {
    const ana = student('Ana')
    const bia = student('Bia')
    store.collection.push({ collectorId: bia.id, collectedId: ana.id })
    const res = await (await as(bia)).get(`/api/cards/${ana.handle}`)
    expect(res.status).toBe(200)
    expect(res.body.viewer).toEqual({ collected: true, connection: 'none' })
  })

  it('404s for an invalid or unknown handle', async () => {
    const api = await as(student('Ana'))
    expect((await api.get('/api/cards/nao-existe')).status).toBe(404)
    expect((await api.get('/api/cards/%20%20')).status).toBe(404)
  })
})

describe('/api/me/card', () => {
  it('returns defaults, then persists a valid patch', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    const first = await api.get('/api/me/card')
    expect(first.body).toMatchObject({ settings: DEFAULT_CARD, public: false })
    expect(first.body.card.viewer).toEqual({ collected: false, connection: 'self' })

    const next = settings({ palette: 'ocean', shape: 'arch', frame: true })
    const patched = await api.patch('/api/me/card').send({ settings: next, public: true })
    expect(patched.status).toBe(200)
    const again = await api.get('/api/me/card')
    expect(again.body.settings).toEqual(next)
    expect(again.body.public).toBe(true)
    expect(again.body.card.settings.palette).toBe('ocean')
  })

  it('refuses locked finishes and palettes with "Opção bloqueada"', async () => {
    const api = await as(student('Ana'))
    for (const patch of [{ finish: 'gold' }, { palette: 'ent-petsi' }, { palette: 'neon' }]) {
      const res = await api.patch('/api/me/card').send({ settings: settings(patch) })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Opção bloqueada')
    }
  })

  it('allows foil once the person has 5 badges', async () => {
    const ana = student('Ana')
    giveBadges(ana.id, 5)
    const api = await as(ana)
    expect((await api.patch('/api/me/card').send({ settings: settings({ finish: 'foil', palette: 'neon' }) })).status).toBe(200)
  })

  it('refuses entities and badges the person does not have, or that were revoked', async () => {
    const ana = student('Ana')
    addMember('dasi', ana.id)
    giveBadges(ana.id, 1)
    store.badges.push({ user_id: ana.id, kind: 'achievement', source_id: 'old', label: 'Old', revoked_at: '2026-01-01T00:00:00Z' })
    const api = await as(ana)
    for (const patch of [{ entities: ['petsi'] }, { badges: ['achievement:other'] }, { badges: ['achievement:old'] }, { badges: ['entity_member:dasi'] }]) {
      const res = await api.patch('/api/me/card').send({ settings: settings(patch) })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Seleção inválida')
    }
    expect((await api.patch('/api/me/card').send({ settings: settings({ entities: ['dasi'], badges: ['achievement:a0'] }) })).status).toBe(200)
  })

  it('rejects malformed bodies, unknown keys, repeats and more than 4 items', async () => {
    const ana = student('Ana')
    for (let i = 0; i < 5; i++) addMember(i % 2 ? 'dasi' : 'petsi', ana.id)
    const api = await as(ana)
    const bad = [
      {}, { settings: { ...DEFAULT_CARD, extra: 1 } }, { settings: { palette: 'coral' } }, { settings: settings({ palette: 'x' }) },
      { settings: settings({ entities: ['dasi', 'dasi'] }) }, { settings: settings({ badges: ['a:1', 'a:2', 'a:3', 'a:4', 'a:5'] }) }, { public: 'yes' }, { other: true },
    ]
    for (const body of bad) expect((await api.patch('/api/me/card').send(body)).status).toBe(400)
  })

  it('builds the subtitle from the title, or from course and entry year', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    expect((await api.get('/api/me/card')).body.card.subtitle).toBe('Sistemas de Informação · Turma 2024')
    addMember('dasi', ana.id)
    store.members[0].title = 'Diretor de Marketing'
    expect((await api.get('/api/me/card')).body.card.subtitle).toBe('Diretor de Marketing · DASI')
    store.people.get(ana.id)!.profile.entry_year = null
    store.members[0].title = null
    expect((await api.get('/api/me/card')).body.card.subtitle).toBe('Sistemas de Informação')
  })

  it('drops a selected entity after the person leaves it, without failing', async () => {
    const ana = student('Ana')
    addMember('dasi', ana.id)
    addMember('petsi', ana.id)
    const api = await as(ana)
    await api.patch('/api/me/card').send({ settings: settings({ entities: ['dasi', 'petsi'] }) })
    store.members.find((m) => m.entity_id === 'dasi')!.left_at = '2026-10-20T00:00:00Z'
    const res = await api.get('/api/me/card')
    expect(res.status).toBe(200)
    expect(res.body.card.entities.map((e: { entityId: string }) => e.entityId)).toEqual(['petsi'])
  })

  it('exposes unlock requirements and no private data in the card', async () => {
    const ana = student('Ana')
    const res = await (await as(ana)).get('/api/me/card')
    expect(res.body.unlocks.finishes).toEqual(['common'])
    expect(res.body.unlocks.requirements.foil).toBe('Ganhe 5 badges')
    expect(JSON.stringify(res.body.card)).not.toContain(ana.email)
    expect(res.body.card).not.toHaveProperty('email')
  })
})
