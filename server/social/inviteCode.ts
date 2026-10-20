import { createHmac, randomInt } from 'node:crypto'
import { inviteCodePepper } from '../lib/config.js'

// No 0/O, 1/I/L: the code is read aloud and typed by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CANONICAL = /^DASI-[A-Z2-9]{4}-[A-Z2-9]{4}$/

export function generateInviteCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `DASI-${pick()}-${pick()}`
}

// Accepts lower case, spaces and a missing dash; returns null when it cannot be a valid code.
export function normalizeInviteCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 40) return null
  const compact = input.toUpperCase().replace(/[\s-]/g, '')
  if (!/^DASI[A-Z2-9]{8}$/.test(compact)) return null
  const code = `DASI-${compact.slice(4, 8)}-${compact.slice(8)}`
  return CANONICAL.test(code) ? code : null
}

// Only this hash is stored; codes are compared by hash.
export function hashInviteCode(code: string) {
  return createHmac('sha256', inviteCodePepper).update(code).digest('hex')
}
