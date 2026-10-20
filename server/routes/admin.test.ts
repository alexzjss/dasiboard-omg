// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
})

describe('PUT /api/admin/entities/:id/admins/:handle', () => {
  it('notifica o membro quando o papel muda, e só então', async () => {
    const root = addPerson({ name: 'Root', handle: 'root', email: 'root@usp.br' })
    const ana = addPerson({ name: 'Ana', handle: 'ana' })
    addMember('dasi', ana.id)
    const api = await as(root)
    await api.put('/api/admin/entities/dasi/admins/ana').send({ admin: true })
    await api.put('/api/admin/entities/dasi/admins/ana').send({ admin: true })
    await api.put('/api/admin/entities/dasi/admins/ana').send({ admin: false })
    expect(store.notifications).toMatchObject([
      { userId: ana.id, type: 'entity_role_changed', actorId: root.id, entityId: 'dasi', payload: { role: 'admin' } },
      { userId: ana.id, type: 'entity_role_changed', payload: { role: 'member' } },
    ])
  })
})
