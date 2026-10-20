import type { SupabaseClient } from '@supabase/supabase-js'

export const HANDLE_PATTERN = /^[a-z0-9._-]{1,64}$/
export const isValidHandle = (value: unknown): value is string => typeof value === 'string' && HANDLE_PATTERN.test(value)

// Same rule as the migration: lower(local part), chars outside [a-z0-9._-] become '-', max 60, fallback 'aluno'.
export function baseHandle(email: string) {
  const local = email.split('@')[0].toLowerCase()
  const cleaned = local.replace(/[^a-z0-9._-]/g, '-').slice(0, 60)
  return cleaned || 'aluno'
}

// n = 1 keeps the base; collisions append 2, 3, ...
export const candidateHandle = (base: string, n: number) => (n <= 1 ? base : `${base}${n}`)

export type SetHandleResult = 'ok' | 'taken' | 'already-set'

export type HandleStore = {
  getProfile(userId: string): Promise<{ handle: string | null } | null>
  insertProfile(userId: string): Promise<void>
  setHandleIfNull(userId: string, handle: string): Promise<SetHandleResult>
}

const MAX_ATTEMPTS = 50

// Guarantees a student_profiles row with a handle. Race-safe: a unique violation
// (another login took the handle first) just moves on to the next candidate.
export async function ensureProfileWithHandle(store: HandleStore, userId: string, email: string) {
  let profile = await store.getProfile(userId)
  if (!profile) {
    await store.insertProfile(userId)
    profile = await store.getProfile(userId)
  }
  if (profile?.handle) return profile.handle

  const base = baseHandle(email)
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    const candidate = candidateHandle(base, n)
    const result = await store.setHandleIfNull(userId, candidate)
    if (result === 'ok') return candidate
    if (result === 'already-set') return (await store.getProfile(userId))?.handle ?? candidate
  }
  throw new Error('Could not allocate a handle')
}

export function supabaseHandleStore(client: SupabaseClient): HandleStore {
  return {
    async getProfile(userId) {
      const { data, error } = await client.from('student_profiles').select('handle').eq('user_id', userId).maybeSingle<{ handle: string | null }>()
      if (error) throw new Error(`Could not load profile: ${error.message}`)
      return data
    },
    async insertProfile(userId) {
      const { error } = await client.from('student_profiles').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
      if (error) throw new Error(`Could not create profile: ${error.message}`)
    },
    async setHandleIfNull(userId, handle) {
      const { data, error } = await client.from('student_profiles').update({ handle }).eq('user_id', userId).is('handle', null).select('handle')
      if (error) {
        if (error.code === '23505') return 'taken'
        throw new Error(`Could not set handle: ${error.message}`)
      }
      return data && data.length > 0 ? 'ok' : 'already-set'
    },
  }
}
