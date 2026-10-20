// @vitest-environment node
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../social/db.js', () => import('../test/fakeSocialDb.js'))

const original = { ...process.env }
afterEach(() => { process.env = { ...original }; vi.resetModules(); vi.restoreAllMocks() })

async function loadApp(devFake: boolean) {
  vi.resetModules()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  process.env.NODE_ENV = 'development'
  if (devFake) process.env.DEV_FAKE_SESSION = '1'
  else delete process.env.DEV_FAKE_SESSION
  const fake = await import('../test/fakeSocialDb.js')
  fake.resetStore()
  fake.addPerson({ name: 'Estudante Local', handle: 'estudante', email: 'estudante@usp.br' })
  const { devUser } = await import('../lib/session.js')
  fake.store.people.forEach((row) => { row.sub = devUser.sub })
  const { default: app } = await import('../index.js')
  return app
}

describe('DEV_FAKE_SESSION', () => {
  it('lets requests without a cookie act as the dev user', async () => {
    const app = await loadApp(true)
    const response = await request(app).get('/api/me/profile')
    expect(response.status).toBe(200)
    expect(response.body.profile).toMatchObject({ handle: 'estudante', email: 'estudante@usp.br' })
    expect((await request(app).get('/api/auth/me')).body.user.email).toBe('estudante@usp.br')
  })

  it('is off by default: no cookie means 401', async () => {
    const app = await loadApp(false)
    expect((await request(app).get('/api/me/profile')).status).toBe(401)
  })
})
