// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addConnection, addEntity, addPerson, insertNotifications, resetStore, store } from '../test/fakeSocialDb.js'
import { as, anonymous } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
})

describe('notifications', () => {
  it('requires a session', async () => {
    expect((await anonymous().get('/api/notifications')).status).toBe(401)
    expect((await anonymous().get('/api/notifications/count')).status).toBe(401)
  })

  it('paginates 25 notifications as 20 + 5 and describes them', async () => {
    const ana = addPerson({ name: 'Ana Souza', handle: 'ana1' })
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    for (let i = 0; i < 25; i++) await insertNotifications([bia.id], { type: 'entity_joined', actorId: ana.id, entityId: 'dasi' })
    const api = await as(bia)
    const first = (await api.get('/api/notifications')).body
    expect(first.items).toHaveLength(20)
    expect(first.nextCursor).toBeTruthy()
    expect(first.items[0]).toMatchObject({ type: 'entity_joined', title: 'Novo membro em DASI', body: 'Ana entrou na entidade.', url: '/entidades/dasi', read: false, actor: { handle: 'ana1', name: 'Ana Souza' } })
    const second = (await api.get(`/api/notifications?cursor=${first.nextCursor}`)).body
    expect(second.items).toHaveLength(5)
    expect(second.nextCursor).toBeNull()
    expect(new Set([...first.items, ...second.items].map((i: { id: string }) => i.id)).size).toBe(25)
  })

  it('rejects a malformed cursor', async () => {
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    expect(((await (await as(bia)).get('/api/notifications?cursor=nope'))).status).toBe(400)
  })

  it('counts unread and pending requests', async () => {
    const ana = addPerson({ name: 'Ana', handle: 'ana1' })
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    addConnection(ana.id, bia.id, 'pending')
    await insertNotifications([bia.id], { type: 'connection_request', actorId: ana.id })
    await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    expect((await (await as(bia)).get('/api/notifications/count')).body).toEqual({ unread: 2, pendingRequests: 1 })
  })

  it('marks one as read and refuses another user\'s notification with 404', async () => {
    const ana = addPerson({ name: 'Ana', handle: 'ana1' })
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    const [mine] = await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    const api = await as(bia)
    expect((await (await as(ana)).post(`/api/notifications/${mine.id}/read`)).status).toBe(404)
    expect(store.notifications[0].readAt).toBeNull()
    expect((await api.post(`/api/notifications/${mine.id}/read`)).status).toBe(204)
    expect(store.notifications[0].readAt).not.toBeNull()
  })

  it('read-all zeroes the unread count', async () => {
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'Y' } })
    const api = await as(bia)
    expect((await api.post('/api/notifications/read-all')).status).toBe(204)
    expect((await api.get('/api/notifications/count')).body.unread).toBe(0)
  })
})
