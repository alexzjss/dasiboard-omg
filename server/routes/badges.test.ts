// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

const NEW_BADGE = { label: 'Monitora', description: 'Ajuda a turma', icon: 'star', color: '#e24a2b' }
let n = 0
const student = (name: string) => addPerson({ name, handle: `${name.toLowerCase()}${++n}` })
// Superadmins come from SUPERADMIN_EMAILS (root@usp.br in the test env).
const superadmin = () => addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
  addEntity('petsi', 'PETSI')
})

describe('admin badges', () => {
  it('refuses non-superadmins', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    expect((await api.post('/api/admin/badges').send(NEW_BADGE)).status).toBe(403)
    expect((await api.get('/api/admin/badges')).status).toBe(403)
  })

  it('creates a definition, grants it to a student and shows it on the profile', async () => {
    const root = superadmin()
    const bia = student('Bia')
    const api = await as(root)
    const created = await api.post('/api/admin/badges').send(NEW_BADGE)
    expect(created.status).toBe(201)
    const def = created.body.definition
    expect(def).toMatchObject({ kind: 'admin_award', entityId: null, label: 'Monitora', icon: 'star' })
    expect((await api.get('/api/admin/badges')).body.definitions).toHaveLength(1)

    expect((await api.put(`/api/admin/badges/${def.id}/holders/${bia.handle}`)).status).toBe(204)
    const profile = await api.get(`/api/people/${bia.handle}`)
    expect(profile.body.badges).toContainEqual(expect.objectContaining({ kind: 'admin_award', label: 'Monitora', icon: 'star', color: '#e24a2b' }))
    expect(store.badges).toMatchObject([{ user_id: bia.id, kind: 'admin_award', source_id: def.id }])
  })

  it('revokes the badge so it leaves the profile', async () => {
    const root = superadmin()
    const bia = student('Bia')
    const api = await as(root)
    const def = (await api.post('/api/admin/badges').send(NEW_BADGE)).body.definition
    await api.put(`/api/admin/badges/${def.id}/holders/${bia.handle}`)
    expect((await api.delete(`/api/admin/badges/${def.id}/holders/${bia.handle}`)).status).toBe(204)
    const profile = await api.get(`/api/people/${bia.handle}`)
    expect(profile.body.badges.filter((b: { kind: string }) => b.kind === 'admin_award')).toHaveLength(0)
  })

  it('archives a definition', async () => {
    const root = superadmin()
    const api = await as(root)
    const def = (await api.post('/api/admin/badges').send(NEW_BADGE)).body.definition
    expect((await api.delete(`/api/admin/badges/${def.id}`)).status).toBe(204)
    expect((await api.get('/api/admin/badges')).body.definitions).toHaveLength(0)
    expect((await api.put(`/api/admin/badges/${def.id}/holders/nobody`)).status).toBe(404)
  })

  it('rejects invalid icon, color and label', async () => {
    const api = await as(superadmin())
    expect((await api.post('/api/admin/badges').send({ ...NEW_BADGE, icon: 'xyz' })).status).toBe(400)
    expect((await api.post('/api/admin/badges').send({ ...NEW_BADGE, color: '#000000' })).status).toBe(400)
    expect((await api.post('/api/admin/badges').send({ ...NEW_BADGE, label: '   ' })).status).toBe(400)
    expect((await api.post('/api/admin/badges').send({ ...NEW_BADGE, label: 'x'.repeat(41) })).status).toBe(400)
    expect((await api.post('/api/admin/badges').send({ ...NEW_BADGE, description: 'x'.repeat(141) })).status).toBe(400)
  })

  it('does not grant an entity definition through the admin route', async () => {
    const root = superadmin()
    const bia = student('Bia')
    addMember('dasi', bia.id)
    const api = await as(root)
    const def = (await api.post('/api/entities/dasi/badges').send(NEW_BADGE)).body.definition
    expect((await api.put(`/api/admin/badges/${def.id}/holders/${bia.handle}`)).status).toBe(404)
  })
})

describe('entity badges', () => {
  it('lets an entity admin create and grant to a member', async () => {
    const admin = student('Admin')
    const bia = student('Bia')
    addMember('dasi', admin.id, 'admin')
    addMember('dasi', bia.id)
    const api = await as(admin)
    const created = await api.post('/api/entities/dasi/badges').send(NEW_BADGE)
    expect(created.status).toBe(201)
    const def = created.body.definition
    expect(def).toMatchObject({ kind: 'entity_award', entityId: 'dasi' })
    expect((await api.get('/api/entities/dasi/badges')).body.definitions).toHaveLength(1)
    expect((await api.put(`/api/entities/dasi/badges/${def.id}/holders/${bia.handle}`)).status).toBe(204)
    expect(store.badges).toContainEqual(expect.objectContaining({ user_id: bia.id, kind: 'entity_award', source_id: def.id, entity_id: 'dasi', label: 'Monitora' }))
    expect((await api.delete(`/api/entities/dasi/badges/${def.id}/holders/${bia.handle}`)).status).toBe(204)
    expect(store.badges.find((b) => b.kind === 'entity_award')?.revoked_at).toBeTruthy()
  })

  it('refuses plain members and admins of other entities', async () => {
    const member = student('Member')
    const other = student('Other')
    addMember('dasi', member.id)
    addMember('petsi', other.id, 'admin')
    expect((await (await as(member)).post('/api/entities/dasi/badges').send(NEW_BADGE)).status).toBe(403)
    expect((await (await as(other)).post('/api/entities/dasi/badges').send(NEW_BADGE)).status).toBe(403)
  })

  it('404s when granting a definition that belongs to another entity', async () => {
    const dasiAdmin = student('Dasi')
    const petsiAdmin = student('Petsi')
    const bia = student('Bia')
    addMember('dasi', dasiAdmin.id, 'admin')
    addMember('petsi', petsiAdmin.id, 'admin')
    addMember('dasi', bia.id)
    const def = (await (await as(petsiAdmin)).post('/api/entities/petsi/badges').send(NEW_BADGE)).body.definition
    const api = await as(dasiAdmin)
    expect((await api.put(`/api/entities/dasi/badges/${def.id}/holders/${bia.handle}`)).status).toBe(404)
    expect((await api.delete(`/api/entities/dasi/badges/${def.id}`)).status).toBe(404)
    expect(store.badges.filter((b) => b.kind === 'entity_award')).toHaveLength(0)
  })

  it('404s when granting to someone who is not an active member', async () => {
    const admin = student('Admin')
    const outsider = student('Outsider')
    const left = student('Left')
    addMember('dasi', admin.id, 'admin')
    addMember('dasi', left.id)
    store.members.find((m) => m.user_id === left.id)!.left_at = new Date().toISOString()
    const api = await as(admin)
    const def = (await api.post('/api/entities/dasi/badges').send(NEW_BADGE)).body.definition
    for (const target of [outsider.handle, left.handle, 'ghost']) {
      const response = await api.put(`/api/entities/dasi/badges/${def.id}/holders/${target}`)
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Membro não encontrado')
    }
    expect(store.badges.filter((b) => b.kind === 'entity_award')).toHaveLength(0)
  })

  it('lets a superadmin manage any entity and validates the body', async () => {
    const api = await as(superadmin())
    expect((await api.post('/api/entities/petsi/badges').send({ ...NEW_BADGE, icon: 'xyz' })).status).toBe(400)
    expect((await api.post('/api/entities/petsi/badges').send(NEW_BADGE)).status).toBe(201)
  })
})

describe('notificações de badge', () => {
  it('conceder notifica uma vez; conceder de novo não', async () => {
    const root = superadmin()
    const bia = student('Bia')
    const api = await as(root)
    const def = (await api.post('/api/admin/badges').send(NEW_BADGE)).body.definition
    await api.put(`/api/admin/badges/${def.id}/holders/${bia.handle}`)
    await api.put(`/api/admin/badges/${def.id}/holders/${bia.handle}`)
    expect(store.notifications).toMatchObject([{ userId: bia.id, type: 'badge_awarded', actorId: root.id, payload: { label: 'Monitora' } }])
  })
})
