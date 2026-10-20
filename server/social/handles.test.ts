// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { extractCourses } from './courses.js'
import { baseHandle, candidateHandle, ensureProfileWithHandle, isValidHandle, type HandleStore, type SetHandleResult } from './handles.js'

describe('baseHandle', () => {
  it.each([
    ['alex.santana@usp.br', 'alex.santana'],
    ['ALEX@usp.br', 'alex'],
    ['a+b c@usp.br', 'a-b-c'],
    ['joão@usp.br', 'jo-o'],
    ['@usp.br', 'aluno'],
    [`${'x'.repeat(80)}@usp.br`, 'x'.repeat(60)],
  ])('%s -> %s', (email, expected) => expect(baseHandle(email)).toBe(expected))

  it('suffixes collisions with 2, 3, ...', () => {
    expect([1, 2, 3].map((n) => candidateHandle('alex', n))).toEqual(['alex', 'alex2', 'alex3'])
  })

  it('generated handles satisfy the route regex', () => {
    expect(isValidHandle(candidateHandle(baseHandle('a+b@usp.br'), 2))).toBe(true)
    expect(isValidHandle('Alex')).toBe(false)
    expect(isValidHandle('a/b')).toBe(false)
    expect(isValidHandle('')).toBe(false)
  })
})

function memoryStore(taken: string[], lose: string[] = []) {
  const profiles = new Map<string, { handle: string | null }>()
  const used = new Set(taken)
  const attempts: string[] = []
  const store: HandleStore = {
    getProfile: async (id) => profiles.get(id) ?? null,
    insertProfile: async (id) => { profiles.set(id, { handle: null }) },
    async setHandleIfNull(id, handle): Promise<SetHandleResult> {
      attempts.push(handle)
      if (profiles.get(id)?.handle) return 'already-set'
      // `lose` simulates a concurrent login grabbing the handle between our read and write
      if (lose.includes(handle)) { used.add(handle); return 'taken' }
      if (used.has(handle)) return 'taken'
      used.add(handle); profiles.get(id)!.handle = handle
      return 'ok'
    },
  }
  return { store, attempts, profiles }
}

describe('ensureProfileWithHandle', () => {
  it('creates the profile and uses the base handle when free', async () => {
    const { store, profiles } = memoryStore([])
    expect(await ensureProfileWithHandle(store, 'u1', 'alex@usp.br')).toBe('alex')
    expect(profiles.get('u1')?.handle).toBe('alex')
  })

  it('moves to the next suffix on collisions', async () => {
    const { store, attempts } = memoryStore(['alex', 'alex2'])
    expect(await ensureProfileWithHandle(store, 'u1', 'alex@usp.br')).toBe('alex3')
    expect(attempts).toEqual(['alex', 'alex2', 'alex3'])
  })

  it('survives a unique violation caused by a race', async () => {
    const { store } = memoryStore([], ['alex'])
    expect(await ensureProfileWithHandle(store, 'u1', 'alex@usp.br')).toBe('alex2')
  })

  it('keeps an existing handle untouched', async () => {
    const { store, attempts, profiles } = memoryStore([])
    profiles.set('u1', { handle: 'custom' })
    expect(await ensureProfileWithHandle(store, 'u1', 'alex@usp.br')).toBe('custom')
    expect(attempts).toEqual([])
  })
})

describe('extractCourses', () => {
  it('keeps only code and title, dedupes and ignores empty codes', () => {
    const result = extractCourses([
      { code: 'ach2023', title: 'AED I', room: '1', building: 'A', weekday: 1 } as never,
      { code: 'ACH2023', title: 'duplicate' },
      { code: '  ', title: 'no code' },
      { code: 'ACH2001', title: '' },
    ])
    expect(result).toEqual([{ code: 'ACH2023', title: 'AED I' }, { code: 'ACH2001', title: 'ACH2001' }])
    expect(Object.keys(result[0])).toEqual(['code', 'title'])
  })
})
