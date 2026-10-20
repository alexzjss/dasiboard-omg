// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { anonymous, as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

const body = { endpoint: 'https://push.example/abc', keys: { p256dh: 'BPk-_1', auth: 'au_th-9' } }

beforeEach(() => { resetStore() })

describe('push routes', () => {
  it('requires a session', async () => {
    expect((await anonymous().get('/api/push/public-key')).status).toBe(401)
  })

  it('public-key is 404 without VAPID', async () => {
    const ana = addPerson({ name: 'Ana', handle: 'ana1' })
    expect((await (await as(ana)).get('/api/push/public-key')).status).toBe(404)
  })

  it('rejects an http endpoint and malformed keys with 400', async () => {
    const ana = addPerson({ name: 'Ana', handle: 'ana1' })
    const api = await as(ana)
    expect((await api.post('/api/push/subscriptions').send({ ...body, endpoint: 'http://push.example/abc' })).status).toBe(400)
    expect((await api.post('/api/push/subscriptions').send({ ...body, keys: { p256dh: 'not base64!', auth: 'x' } })).status).toBe(400)
    expect((await api.post('/api/push/subscriptions').send({ ...body, endpoint: `https://x/${'a'.repeat(1000)}` })).status).toBe(400)
    expect(store.pushSubs).toHaveLength(0)
  })

  it('saving the same subscription twice keeps one row, and delete removes it', async () => {
    const ana = addPerson({ name: 'Ana', handle: 'ana1' })
    const api = await as(ana)
    expect((await api.post('/api/push/subscriptions').send(body)).status).toBe(204)
    expect((await api.post('/api/push/subscriptions').send(body)).status).toBe(204)
    expect(store.pushSubs).toHaveLength(1)
    expect((await api.delete('/api/push/subscriptions').send({ endpoint: body.endpoint })).status).toBe(204)
    expect(store.pushSubs).toHaveLength(0)
  })
})
