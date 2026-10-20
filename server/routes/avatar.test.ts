// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addAvatarObject, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let n = 0
const student = (name: string) => addPerson({ name, handle: `${name.toLowerCase()}${++n}` })

beforeEach(() => resetStore())

describe('avatar upload', () => {
  it('rejects unsupported content types', async () => {
    const api = await as(student('Ana'))
    expect((await api.post('/api/me/avatar/upload-url').send({ contentType: 'image/gif' })).status).toBe(400)
    expect((await api.post('/api/me/avatar/upload-url').send({ contentType: 'constructor' })).status).toBe(400)
  })

  it('issues an upload url under the viewer folder', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    const res = await api.post('/api/me/avatar/upload-url').send({ contentType: 'image/webp' })
    expect(res.status).toBe(200)
    expect(res.body.path).toMatch(new RegExp(`^${ana.id}/[a-z0-9]+\\.webp$`))
    expect(typeof res.body.uploadUrl).toBe('string')
  })

  it('refuses another user path and path traversal', async () => {
    const ana = student('Ana')
    const bia = student('Bia')
    addAvatarObject(`${bia.id}/x.webp`)
    const api = await as(ana)
    expect((await api.put('/api/me/avatar').send({ path: `${bia.id}/x.webp` })).status).toBe(400)
    expect((await api.put('/api/me/avatar').send({ path: '../x.webp' })).status).toBe(400)
    expect((await api.put('/api/me/avatar').send({ path: `${ana.id}/../${bia.id}/x.webp` })).status).toBe(400)
    expect((await api.put('/api/me/avatar').send({})).status).toBe(400)
  })

  it('404s when the object was not uploaded', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    expect((await api.put('/api/me/avatar').send({ path: `${ana.id}/abc.webp` })).status).toBe(404)
  })

  it('confirms the photo, replaces the Google picture and drops old files', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    addAvatarObject(`${ana.id}/old.png`)
    addAvatarObject(`${ana.id}/abc.webp`)
    const url = `https://fake.storage/avatars/${ana.id}/abc.webp`
    const res = await api.put('/api/me/avatar').send({ path: `${ana.id}/abc.webp` })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ picture: url })
    expect(store.avatarObjects).toEqual(new Set([`${ana.id}/abc.webp`]))
    const profile = await api.get(`/api/people/${ana.handle}`)
    expect(profile.body.profile.picture).toBe(url)
    const own = await api.get('/api/me/profile')
    expect(own.body.profile).toMatchObject({ picture: url, hasCustomAvatar: true })
  })

  it('falls back to the Google picture on delete', async () => {
    const ana = student('Ana')
    store.people.get(ana.id)!.user.picture = 'https://google/pic.jpg'
    const api = await as(ana)
    addAvatarObject(`${ana.id}/abc.webp`)
    await api.put('/api/me/avatar').send({ path: `${ana.id}/abc.webp` })
    const res = await api.delete('/api/me/avatar')
    expect(res.status).toBe(200)
    expect(res.body.picture).toBe('https://google/pic.jpg')
    expect(store.avatarObjects.size).toBe(0)
    const own = await api.get('/api/me/profile')
    expect(own.body.profile).toMatchObject({ picture: 'https://google/pic.jpg', hasCustomAvatar: false })
  })
})
