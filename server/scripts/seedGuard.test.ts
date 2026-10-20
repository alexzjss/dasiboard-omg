// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { looksLikeProduction } from './seedGuard.js'

describe('seed:dev production guard', () => {
  it.each([
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'https://abcd.dev.supabase.co',
    'https://myapp-staging.supabase.co',
    'https://dasiboard-dev.supabase.co',
    'https://test.example.com',
  ])('lets %s run without confirmation', (url) => expect(looksLikeProduction(url)).toBe(false))

  it.each([
    'https://abcdefghijklmnop.supabase.co',
    'https://dasiboard.supabase.co',
    'https://developer-portal.example.com', // "dev" only counts as a whole label
    'not a url',
    '',
    undefined,
  ])('treats %s as production', (url) => expect(looksLikeProduction(url)).toBe(true))
})
