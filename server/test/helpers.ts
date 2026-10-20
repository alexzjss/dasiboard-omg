import request from 'supertest'
import app from '../index.js'
import { createSession } from '../lib/session.js'

type TestUser = { sub: string; name: string; email: string }

// Supertest client that sends a valid session cookie for `user`.
export async function as(user: TestUser) {
  const token = await createSession({ sub: user.sub, name: user.name, email: user.email })
  const cookie = `orbe_session=${token}`
  return {
    get: (url: string) => request(app).get(url).set('Cookie', cookie),
    post: (url: string) => request(app).post(url).set('Cookie', cookie),
    put: (url: string) => request(app).put(url).set('Cookie', cookie),
    patch: (url: string) => request(app).patch(url).set('Cookie', cookie),
    delete: (url: string) => request(app).delete(url).set('Cookie', cookie),
  }
}

export const anonymous = () => ({
  get: (url: string) => request(app).get(url),
  post: (url: string) => request(app).post(url),
})
