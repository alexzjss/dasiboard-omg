// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashInviteCode } from '../social/inviteCode.js'
import { addEntity, addMember, addPerson, resetStore, store } from '../test/fakeSocialDb.js'
import { as } from '../test/helpers.js'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

const CODE = 'DASI-7KQ2-ABCD'
let n = 0
// Each test gets its own students: the join rate limit is per (ip, user) and lives as long as the app.
const student = (name: string) => addPerson({ name, handle: `${name.toLowerCase()}${++n}` })

beforeEach(() => {
  resetStore()
  addEntity('dasi', 'DASI', hashInviteCode(CODE))
  addEntity('sintese', 'Sintese Jr.')
})

describe('POST /api/entities/join', () => {
  it('joins with the right code (any case/format), creates membership and badge', async () => {
    const ana = student('Ana')
    const response = await (await as(ana)).post('/api/entities/join').send({ code: ' dasi-7kq2-abcd ' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ entity: { id: 'dasi', name: 'DASI' } })
    expect(store.members).toMatchObject([{ entity_id: 'dasi', user_id: ana.id, role: 'member', left_at: null }])
    expect(store.badges).toMatchObject([{ user_id: ana.id, source_id: 'dasi', label: 'DASI', revoked_at: null }])
  })

  it('is idempotent for an active member', async () => {
    const ana = student('Ana')
    const api = await as(ana)
    await api.post('/api/entities/join').send({ code: CODE })
    expect((await api.post('/api/entities/join').send({ code: CODE })).status).toBe(200)
    expect(store.members).toHaveLength(1)
  })

  it('answers every kind of invalid code identically (wrong, malformed, rotated, missing)', async () => {
    const bia = student('Bia')
    const api = await as(bia)
    const bodies = []
    for (const code of ['DASI-ZZZZ-ZZZZ', 'not a code', 'SINTESE-1234', undefined, 42]) {
      const response = await api.post('/api/entities/join').send({ code })
      expect(response.status).toBe(404)
      bodies.push(response.body)
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1)
    expect(store.members).toHaveLength(0)
  })

  it('does not join entities without a code configured, nor with the old code after rotation', async () => {
    const caio = student('Caio')
    const api = await as(caio)
    store.entities.get('dasi')!.hash = hashInviteCode('DASI-NEW2-CODE')
    expect((await api.post('/api/entities/join').send({ code: CODE })).status).toBe(404)
    expect((await api.post('/api/entities/join').send({ code: 'DASI-NEW2-CODE' })).status).toBe(200)
  })

  it('rate limits to 5 attempts per 10 minutes (429), right or wrong', async () => {
    const dani = student('Dani')
    const api = await as(dani)
    const statuses = []
    for (let i = 0; i < 7; i++) statuses.push((await api.post('/api/entities/join').send({ code: 'DASI-ZZZZ-ZZZZ' })).status)
    expect(statuses).toEqual([404, 404, 404, 404, 404, 429, 429])
    expect((await api.post('/api/entities/join').send({ code: CODE })).status).toBe(429)
    expect(store.members).toHaveLength(0)
  })

  it('rejects a foreign origin', async () => {
    const eva = student('Eva')
    expect((await (await as(eva)).post('/api/entities/join').set('Origin', 'https://evil.example').send({ code: CODE })).status).toBe(403)
  })

  it('stores only the hash of the code', () => {
    expect(JSON.stringify([...store.entities.values()])).not.toContain(CODE)
  })
})

describe('leaving an entity', () => {
  it('marks left_at and revokes the badge without deleting anything', async () => {
    const gil = student('Gil')
    addMember('dasi', gil.id, 'admin')
    const response = await (await as(gil)).delete('/api/entities/dasi/membership')
    expect(response.status).toBe(204)
    expect(store.members[0].left_at).not.toBeNull()
    expect(store.members[0].role).toBe('member')
    expect(store.badges[0].revoked_at).not.toBeNull()
  })

  it('404 when not a member or entity does not exist', async () => {
    const hugo = student('Hugo')
    const api = await as(hugo)
    expect((await api.delete('/api/entities/dasi/membership')).status).toBe(404)
    expect((await api.delete('/api/entities/ghost/membership')).status).toBe(404)
    expect((await api.delete('/api/entities/BAD ID/membership')).status).toBe(404)
  })
})

describe('GET /api/entities/:id/members', () => {
  it('lists active members without emails, 404 for unknown entities', async () => {
    const ivo = student('Ivo')
    const joao = student('Joao')
    addMember('dasi', ivo.id, 'admin')
    addMember('dasi', joao.id)
    await (await as(joao)).delete('/api/entities/dasi/membership')
    const api = await as(ivo)
    const { body } = await api.get('/api/entities/dasi/members')
    expect(body.members).toEqual([{ handle: ivo.handle, name: 'Ivo', picture: null, role: 'admin', joinedAt: expect.any(String) }])
    expect(JSON.stringify(body)).not.toContain('@usp.br')
    expect((await api.get('/api/entities/ghost/members')).status).toBe(404)
  })
})

describe('admin of an entity (IDOR)', () => {
  it('lets an admin of THIS entity generate a code, returned once and stored hashed', async () => {
    const lia = student('Lia')
    addMember('dasi', lia.id, 'admin')
    const response = await (await as(lia)).post('/api/entities/dasi/invite-code')
    expect(response.status).toBe(200)
    expect(response.body.code).toMatch(/^DASI-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(store.entities.get('dasi')!.hash).toBe(hashInviteCode(response.body.code))
    expect(JSON.stringify([...store.entities.values()])).not.toContain(response.body.code)
    // the old code stops working
    const newcomer = student('Novo')
    expect((await (await as(newcomer)).post('/api/entities/join').send({ code: CODE })).status).toBe(404)
  })

  it('denies (403) an admin of ANOTHER entity on code, member removal and everything else', async () => {
    const mia = student('Mia') // admin of sintese only
    const nuno = student('Nuno') // plain member of dasi
    addMember('sintese', mia.id, 'admin')
    addMember('dasi', nuno.id)
    const before = store.entities.get('dasi')!.hash
    const api = await as(mia)
    expect((await api.post('/api/entities/dasi/invite-code')).status).toBe(403)
    expect((await api.delete(`/api/entities/dasi/members/${nuno.handle}`)).status).toBe(403)
    expect(store.entities.get('dasi')!.hash).toBe(before)
    expect(store.members.find((m) => m.user_id === nuno.id)!.left_at).toBeNull()
  })

  it('denies a plain member and a non-member (403)', async () => {
    const otto = student('Otto')
    const pia = student('Pia')
    addMember('dasi', otto.id)
    expect((await (await as(otto)).post('/api/entities/dasi/invite-code')).status).toBe(403)
    expect((await (await as(pia)).post('/api/entities/dasi/invite-code')).status).toBe(403)
  })

  it('denies a former admin who left', async () => {
    const quim = student('Quim')
    addMember('dasi', quim.id, 'admin')
    await (await as(quim)).delete('/api/entities/dasi/membership')
    expect((await (await as(quim)).post('/api/entities/dasi/invite-code')).status).toBe(403)
  })

  it('404 for an unknown entity before any permission talk', async () => {
    const rui = student('Rui')
    expect((await (await as(rui)).post('/api/entities/ghost/invite-code')).status).toBe(404)
  })

  it('lets an admin remove a regular member, but not another admin, and not themselves', async () => {
    const sara = student('Sara')
    const tito = student('Tito')
    const ugo = student('Ugo')
    addMember('dasi', sara.id, 'admin')
    addMember('dasi', tito.id)
    addMember('dasi', ugo.id, 'admin')
    const api = await as(sara)
    expect((await api.delete(`/api/entities/dasi/members/${tito.handle}`)).status).toBe(204)
    expect(store.badges.find((b) => b.user_id === tito.id)!.revoked_at).not.toBeNull()
    expect((await api.delete(`/api/entities/dasi/members/${ugo.handle}`)).status).toBe(403)
    expect((await api.delete(`/api/entities/dasi/members/${sara.handle}`)).status).toBe(400)
    expect((await api.delete(`/api/entities/dasi/members/${tito.handle}`)).status).toBe(404) // already gone
    expect((await api.delete('/api/entities/dasi/members/nobody')).status).toBe(404)
  })

  it('lets a superadmin act on any entity, including removing admins', async () => {
    const root = addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
    const vera = student('Vera')
    addMember('dasi', vera.id, 'admin')
    const api = await as(root)
    expect((await api.post('/api/entities/sintese/invite-code')).status).toBe(200)
    expect((await api.delete(`/api/entities/dasi/members/${vera.handle}`)).status).toBe(204)
  })
})

describe('PUT /api/admin/entities/:id/admins/:handle', () => {
  it('is superadmin only: entity admins get 403', async () => {
    const wal = student('Wal')
    const xena = student('Xena')
    addMember('dasi', wal.id, 'admin')
    addMember('dasi', xena.id)
    const response = await (await as(wal)).put(`/api/admin/entities/dasi/admins/${xena.handle}`).send({ admin: true })
    expect(response.status).toBe(403)
    expect(store.members.find((m) => m.user_id === xena.id)!.role).toBe('member')
  })

  it('promotes and demotes an active member', async () => {
    const root = addPerson({ name: 'Root', handle: `root${++n}`, email: 'ROOT@usp.br' })
    const yan = student('Yan')
    addMember('dasi', yan.id)
    const api = await as(root)
    expect((await api.put(`/api/admin/entities/dasi/admins/${yan.handle}`).send({ admin: true })).body.role).toBe('admin')
    expect(store.members.find((m) => m.user_id === yan.id)!.role).toBe('admin')
    expect((await api.put(`/api/admin/entities/dasi/admins/${yan.handle}`).send({ admin: false })).body.role).toBe('member')
  })

  it('requires the target to be an ACTIVE member of that entity', async () => {
    const root = addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
    const zeca = student('Zeca')
    addMember('sintese', zeca.id) // member of another entity only
    const api = await as(root)
    expect((await api.put(`/api/admin/entities/dasi/admins/${zeca.handle}`).send({ admin: true })).status).toBe(409)
    addMember('dasi', zeca.id)
    await (await as(zeca)).delete('/api/entities/dasi/membership')
    expect((await api.put(`/api/admin/entities/dasi/admins/${zeca.handle}`).send({ admin: true })).status).toBe(409)
    expect(store.members.some((m) => m.entity_id === 'dasi' && m.role === 'admin')).toBe(false)
  })

  it('validates input', async () => {
    const root = addPerson({ name: 'Root', handle: `root${++n}`, email: 'root@usp.br' })
    const api = await as(root)
    expect((await api.put('/api/admin/entities/dasi/admins/nobody').send({ admin: true })).status).toBe(404)
    expect((await api.put('/api/admin/entities/ghost/admins/nobody').send({ admin: true })).status).toBe(404)
    expect((await api.put('/api/admin/entities/dasi/admins/nobody').send({ admin: 'yes' })).status).toBe(400)
  })
})
