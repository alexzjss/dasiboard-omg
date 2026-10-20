// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from './inviteCode.js'

describe('invite codes', () => {
  it('generates readable DASI-XXXX-XXXX codes without ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode()
      expect(code).toMatch(/^DASI-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
      expect(code.slice(5)).not.toMatch(/[01OIL]/)
    }
  })

  it('does not repeat in practice', () => {
    expect(new Set(Array.from({ length: 500 }, generateInviteCode)).size).toBe(500)
  })

  it('normalizes case, spaces and missing dashes', () => {
    expect(normalizeInviteCode(' dasi-7kq2-abcd ')).toBe('DASI-7KQ2-ABCD')
    expect(normalizeInviteCode('dasi7kq2abcd')).toBe('DASI-7KQ2-ABCD')
  })

  it.each([undefined, null, 5, '', 'DASI-7KQ2', 'DASI-7KQ2-ABC0', 'XXXX-7KQ2-ABCD', 'a'.repeat(100), {}])('rejects %j', (input) => {
    expect(normalizeInviteCode(input)).toBeNull()
  })

  it('hashes with HMAC-SHA256: stable, 64 hex chars, never the plain code', () => {
    const hash = hashInviteCode('DASI-7KQ2-ABCD')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashInviteCode('DASI-7KQ2-ABCD'))
    expect(hash).not.toBe(hashInviteCode('DASI-7KQ2-ABCE'))
  })
})
