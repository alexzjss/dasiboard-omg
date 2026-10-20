// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addConnection, addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { anonymous, as } from '../test/helpers.js'
import { encodeFeedCursor } from './social.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

let alex: ReturnType<typeof addPerson>
let bia: ReturnType<typeof addPerson>
let caio: ReturnType<typeof addPerson>

beforeEach(() => {
  resetStore()
  alex = addPerson({ name: 'Alex', handle: 'alex', courses: ['ACH2001', 'ACH2023'] })
  bia = addPerson({ name: 'Bia', handle: 'bia', courses: ['ACH2001', 'ACH2003'] })
  caio = addPerson({ name: 'Caio', handle: 'caio', courses: ['ACH2001'] })
})

describe('authentication', () => {
  it('requires a session on every social route', async () => {
    const api = anonymous()
    for (const url of ['/api/me/profile', '/api/people', '/api/people/bia', '/api/connections', '/api/notifications/count', '/api/feed']) {
      expect((await api.get(url)).status, url).toBe(401)
    }
    expect((await api.post('/api/connections/bia')).status).toBe(401)
  })

  it('rejects writes from a foreign origin', async () => {
    const api = await as(alex)
    const response = await api.post('/api/connections/bia').set('Origin', 'https://evil.example')
    expect(response.status).toBe(403)
    expect(store.connections).toHaveLength(0)
  })
})

describe('GET /api/people/:handle', () => {
  it('answers 404 with the same body for unknown, malformed and nonexistent handles', async () => {
    const api = await as(alex)
    const responses = await Promise.all(['nobody', 'Bad Handle', 'a%2Fb', 'x'.repeat(80), '..'].map((handle) => api.get(`/api/people/${handle}`)))
    for (const response of responses) {
      expect(response.status).toBe(404)
      expect(response.body).toEqual(responses[0].body)
    }
  })

  it('never exposes the email or internal ids of another student', async () => {
    const api = await as(alex)
    const { body } = await api.get('/api/people/bia')
    expect(JSON.stringify(body)).not.toContain('bia@usp.br')
    expect(JSON.stringify(body)).not.toContain(bia.id)
  })

  it('shows courses (code and title only) with common ones flagged', async () => {
    const api = await as(alex)
    const { body } = await api.get('/api/people/bia')
    expect(body.courses).toEqual([
      { code: 'ACH2001', title: 'Matéria ACH2001', common: true },
      { code: 'ACH2003', title: 'Matéria ACH2003', common: false },
    ])
    expect(body.commonCourses).toBe(1)
    expect(body.visibility).toEqual({ courses: true, connections: true })
  })

  it('hides courses and counts from strangers when set to "connections", and from everyone when "none"', async () => {
    store.people.get(bia.id)!.profile.show_courses = 'connections'
    store.people.get(caio.id)!.profile.show_courses = 'none'
    const api = await as(alex)
    const hiddenToStranger = (await api.get('/api/people/bia')).body
    expect(hiddenToStranger.courses).toBeNull()
    expect(hiddenToStranger.commonCourses).toBeNull()
    expect(hiddenToStranger.classmatesInCommon).toBeNull()

    addConnection(alex.id, bia.id, 'pending') // a pending request is not a connection
    expect((await api.get('/api/people/bia')).body.courses).toBeNull()

    store.connections[0].status = 'accepted'
    expect((await api.get('/api/people/bia')).body.courses).toHaveLength(2)

    addConnection(alex.id, caio.id, 'accepted') // "none" hides even from connections
    expect((await api.get('/api/people/caio')).body.courses).toBeNull()
  })

  it('shows the owner everything, even with "none"', async () => {
    store.people.get(alex.id)!.profile.show_courses = 'none'
    store.people.get(alex.id)!.profile.show_connections = 'none'
    const { body } = await (await as(alex)).get('/api/people/alex')
    expect(body.courses).toHaveLength(2)
    expect(body.connections).not.toBeNull()
    expect(body.profile.self).toBe(true)
  })

  it('hides the connection list per the owner setting', async () => {
    addConnection(bia.id, caio.id, 'accepted')
    store.people.get(bia.id)!.profile.show_connections = 'none'
    const api = await as(alex)
    expect((await api.get('/api/people/bia')).body.connections).toBeNull()
    store.people.get(bia.id)!.profile.show_connections = 'all'
    expect((await api.get('/api/people/bia')).body.connections).toEqual({ count: 1, people: [{ handle: 'caio', name: 'Caio', picture: null }] })
  })

  it('lists classmates in common only when their own course lists are visible to the viewer', async () => {
    // caio shares ACH2001 with both alex and bia
    const api = await as(alex)
    expect((await api.get('/api/people/bia')).body.classmatesInCommon).toEqual([{ handle: 'caio', name: 'Caio', picture: null }])
    store.people.get(caio.id)!.profile.show_courses = 'none'
    expect((await api.get('/api/people/bia')).body.classmatesInCommon).toEqual([])
  })
})

describe('GET /api/people', () => {
  it('lists others with connection state and a common-course count, without email', async () => {
    addConnection(bia.id, alex.id, 'pending')
    const { body } = await (await as(alex)).get('/api/people')
    expect(body.people.map((p: { handle: string }) => p.handle)).toEqual(['bia', 'caio'])
    expect(body.people[0]).toMatchObject({ connection: 'pending_received', commonCourses: 1 })
    expect(JSON.stringify(body)).not.toContain('@usp.br')
  })

  it('does not leak common courses of people who hide them', async () => {
    store.people.get(caio.id)!.profile.show_courses = 'none'
    const { body } = await (await as(alex)).get('/api/people')
    expect(body.people.find((p: { handle: string }) => p.handle === 'caio').commonCourses).toBeNull()
  })

  it('the materia filter ignores people who hide their courses', async () => {
    store.people.get(caio.id)!.profile.show_courses = 'none'
    const { body } = await (await as(alex)).get('/api/people?materia=ach2001')
    expect(body.people.map((p: { handle: string }) => p.handle)).toEqual(['bia'])
  })

  it('filters by entity and paginates with a cursor', async () => {
    addEntity('dasi', 'DASI')
    addMember('dasi', bia.id)
    expect((await (await as(alex)).get('/api/people?entidade=dasi')).body.people.map((p: { handle: string }) => p.handle)).toEqual(['bia'])
    for (let i = 0; i < 25; i++) addPerson({ name: `P${i}`, handle: `p${String(i).padStart(2, '0')}` })
    const api = await as(alex)
    const first = (await api.get('/api/people')).body
    expect(first.people).toHaveLength(20)
    expect(first.nextCursor).toBe(first.people[19].handle)
    const second = (await api.get(`/api/people?cursor=${first.nextCursor}`)).body
    expect(second.people.length).toBeGreaterThan(0)
    expect(second.people[0].handle > first.nextCursor).toBe(true)
  })

  it.each(['ano=abc', 'entidade=Bad Id', 'materia=%27%3B--', `q=${'a'.repeat(61)}`, 'cursor=Bad%20Cursor'])('rejects invalid filter %s', async (query) => {
    expect((await (await as(alex)).get(`/api/people?${query}`)).status).toBe(400)
  })
})

describe('connections', () => {
  it('rejects connecting with yourself (400)', async () => {
    const response = await (await as(alex)).post('/api/connections/alex')
    expect(response.status).toBe(400)
    expect(store.connections).toHaveLength(0)
  })

  it('creates a pending request and is idempotent', async () => {
    const api = await as(alex)
    expect((await api.post('/api/connections/bia')).status).toBe(201)
    const again = await api.post('/api/connections/bia')
    expect(again.status).toBe(200)
    expect(again.body).toEqual({ status: 'pending' })
    expect(store.connections).toEqual([{ requester_id: alex.id, addressee_id: bia.id, status: 'pending' }])
  })

  it('turns a request in the opposite direction into an acceptance', async () => {
    addConnection(bia.id, alex.id, 'pending')
    const response = await (await as(alex)).post('/api/connections/bia')
    expect(response.body).toEqual({ status: 'accepted' })
    expect(store.connections).toEqual([{ requester_id: bia.id, addressee_id: alex.id, status: 'accepted' }])
  })

  it('does not downgrade an accepted connection', async () => {
    addConnection(bia.id, alex.id, 'accepted')
    expect((await (await as(alex)).post('/api/connections/bia')).body).toEqual({ status: 'accepted' })
    expect(store.connections).toHaveLength(1)
  })

  it('returns 404 (same body as profiles) when the target does not exist', async () => {
    const response = await (await as(alex)).post('/api/connections/nobody')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Perfil não encontrado' })
  })

  it('only the addressee can accept; the requester cannot accept their own request', async () => {
    addConnection(alex.id, bia.id, 'pending')
    expect((await (await as(alex)).post('/api/connections/bia/accept')).status).toBe(404)
    expect(store.connections[0].status).toBe('pending')
    expect((await (await as(bia)).post('/api/connections/alex/accept')).body).toEqual({ status: 'accepted' })
    expect(store.connections[0].status).toBe('accepted')
  })

  it('a third party cannot touch someone elses request', async () => {
    addConnection(alex.id, bia.id, 'pending')
    expect((await (await as(caio)).post('/api/connections/alex/accept')).status).toBe(404)
    expect((await (await as(caio)).delete('/api/connections/alex')).status).toBe(204)
    expect(store.connections).toHaveLength(1) // delete only affects caio-alex rows
  })

  it('declines, cancels and unfriends with DELETE (idempotent)', async () => {
    addConnection(alex.id, bia.id, 'pending')
    const api = await as(bia)
    expect((await api.delete('/api/connections/alex')).status).toBe(204)
    expect(store.connections).toHaveLength(0)
    expect((await api.delete('/api/connections/alex')).status).toBe(204)
  })

  it('lists pending requests received and accepted connections, and counts them cheaply', async () => {
    addConnection(bia.id, alex.id, 'pending')
    addConnection(alex.id, caio.id, 'accepted')
    const api = await as(alex)
    expect((await api.get('/api/notifications/count')).body).toEqual({ pendingRequests: 1 })
    expect((await api.get('/api/connections?status=pending')).body.connections.map((c: { handle: string }) => c.handle)).toEqual(['bia'])
    expect((await api.get('/api/connections?status=accepted')).body.connections.map((c: { handle: string }) => c.handle)).toEqual(['caio'])
    expect((await api.get('/api/connections?status=sent')).status).toBe(400)
  })
})

describe('profile', () => {
  it('returns the own profile with entities, pending requests and the superadmin flag', async () => {
    addEntity('dasi', 'DASI')
    addMember('dasi', alex.id, 'admin')
    addConnection(bia.id, alex.id, 'pending')
    const { body } = await (await as(alex)).get('/api/me/profile')
    expect(body.profile).toMatchObject({ handle: 'alex', email: 'alex@usp.br', showCourses: 'all' })
    expect(body.entities).toMatchObject([{ entityId: 'dasi', role: 'admin' }])
    expect(body.adminOf).toEqual(['dasi'])
    expect(body.pendingCount).toBe(1)
    expect(body.isSuperadmin).toBe(false)
  })

  it('flags superadmins from SUPERADMIN_EMAILS (case-insensitive)', async () => {
    const root = addPerson({ name: 'Root', handle: 'root', email: 'root@usp.br' })
    expect((await (await as(root)).get('/api/me/profile')).body.isSuperadmin).toBe(true)
  })

  it('updates validated fields and refuses invalid links', async () => {
    const api = await as(alex)
    const ok = await api.patch('/api/me/profile').send({ bio: 'Oi', entryYear: 2023, showCourses: 'none', links: { github: 'https://github.com/alex' } })
    expect(ok.status).toBe(200)
    expect(ok.body.profile).toMatchObject({ bio: 'Oi', entryYear: 2023, showCourses: 'none', links: { github: 'https://github.com/alex' } })
    for (const links of [{ github: 'https://evil.com/alex' }, { github: 'http://github.com/alex' }, { linkedin: 'https://github.com/alex' }, { instagram: 'javascript:alert(1)' }]) {
      expect((await api.patch('/api/me/profile').send({ links })).status).toBe(400)
    }
    expect((await api.patch('/api/me/profile').send({ handle: 'hacked' })).status).toBe(400)
    expect(store.people.get(alex.id)!.profile.handle).toBe('alex')
  })
})

describe('GET /api/feed', () => {
  const at = (n: number) => new Date(Date.UTC(2026, 9, 20, 12, 0, n)).toISOString()

  it('emits events newest first and respects privacy', async () => {
    addEntity('dasi', 'DASI')
    store.people.get(caio.id)!.profile.show_courses = 'none'
    store.feed = [
      { id: 'j:dasi:bia', type: 'entity_join', at: at(1), userId: bia.id, entityId: 'dasi', entityName: 'DASI' },
      { id: 'u:caio', type: 'classmate_joined', at: at(3), userId: caio.id },
      { id: 'u:bia', type: 'classmate_joined', at: at(2), userId: bia.id },
    ]
    const { body } = await (await as(alex)).get('/api/feed')
    // caio hides his courses from alex, so "classmate joined" is dropped; the join is always visible
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['u:bia', 'j:dasi:bia'])
    expect(body.nextCursor).toBeNull()
  })

  it('needs both people to allow connection events', async () => {
    store.feed = [{ id: 'c:bia:caio', type: 'connection', at: at(1), userId: bia.id, otherUserId: caio.id }]
    const api = await as(alex)
    expect((await api.get('/api/feed')).body.items).toHaveLength(1)
    store.people.get(caio.id)!.profile.show_connections = 'connections'
    expect((await api.get('/api/feed')).body.items).toHaveLength(0)
    addConnection(alex.id, caio.id, 'accepted')
    expect((await api.get('/api/feed')).body.items).toHaveLength(1)
  })

  it('paginates with a cursor and rejects a malformed one', async () => {
    addEntity('dasi', 'DASI')
    for (let i = 0; i < 25; i++) {
      const p = addPerson({ name: `M${i}`, handle: `m${i}` })
      store.feed.push({ id: `j:dasi:${p.handle}`, type: 'entity_join', at: at(i), userId: p.id, entityId: 'dasi', entityName: 'DASI' })
    }
    const api = await as(alex)
    const first = (await api.get('/api/feed')).body
    expect(first.items).toHaveLength(20)
    expect(first.nextCursor).toBeTruthy()
    expect(first.items[0].at > first.items[19].at).toBe(true)
    expect((await api.get('/api/feed?cursor=not-a-cursor')).status).toBe(400)
    expect((await api.get(`/api/feed?cursor=${encodeFeedCursor({ at: 'nope', id: 'x' })}`)).status).toBe(400)
  })
})
