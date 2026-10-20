// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntity, addPerson, insertNotifications, resetStore, savePushSubscription, store } from '../test/fakeSocialDb.js'
import { createPushDeliverer, type PushSender } from './push.js'

vi.mock('./db.js', () => import('../test/fakeSocialDb.js'))

const keys = { p256dh: 'p', auth: 'a' }

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('createPushDeliverer', () => {
  it('sends one payload per subscription with the described text', async () => {
    const ana = addPerson({ name: 'Ana Souza', handle: 'ana1' })
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    await savePushSubscription(bia.id, { endpoint: 'https://push.example/1', keys })
    await savePushSubscription(bia.id, { endpoint: 'https://push.example/2', keys })
    const rows = await insertNotifications([bia.id], { type: 'entity_joined', actorId: ana.id, entityId: 'dasi' })
    const send = vi.fn<PushSender>(async () => ({ statusCode: 201 }))
    await createPushDeliverer(send)(rows)
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(send.mock.calls[0][1])).toEqual({ title: 'Novo membro em DASI', body: 'Ana entrou na entidade.', url: '/entidades/dasi', tag: rows[0].id })
  })

  it('deletes a dead subscription (410) and keeps sending the rest', async () => {
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    await savePushSubscription(bia.id, { endpoint: 'https://push.example/dead', keys })
    await savePushSubscription(bia.id, { endpoint: 'https://push.example/ok', keys })
    const rows = await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    const sent: string[] = []
    const send: PushSender = async (sub) => {
      sent.push(sub.endpoint)
      if (sub.endpoint.endsWith('dead')) throw Object.assign(new Error('gone'), { statusCode: 410 })
      return { statusCode: 201 }
    }
    await createPushDeliverer(send, { concurrency: 1 })(rows)
    expect(sent).toHaveLength(2)
    expect(store.pushSubs.map((s) => s.endpoint)).toEqual(['https://push.example/ok'])
  })

  it('keeps the subscription on other errors', async () => {
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    await savePushSubscription(bia.id, { endpoint: 'https://push.example/1', keys })
    const rows = await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    await createPushDeliverer(async () => { throw Object.assign(new Error('boom'), { statusCode: 500 }) })(rows)
    expect(store.pushSubs).toHaveLength(1)
  })

  it('gives up at the deadline', async () => {
    const bia = addPerson({ name: 'Bia', handle: 'bia1' })
    for (let i = 0; i < 5; i++) await savePushSubscription(bia.id, { endpoint: `https://push.example/${i}`, keys })
    const rows = await insertNotifications([bia.id], { type: 'badge_awarded', payload: { label: 'X' } })
    const send: PushSender = () => new Promise((resolve) => setTimeout(() => resolve({ statusCode: 201 }), 100))
    const started = Date.now()
    await createPushDeliverer(send, { concurrency: 1, deadlineMs: 50 })(rows)
    expect(Date.now() - started).toBeLessThan(200)
  })
})
