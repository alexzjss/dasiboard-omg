// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateLink, validateProfilePatch } from './validation.js'

describe('validateLink', () => {
  it.each([
    ['github', 'https://github.com/alex'],
    ['github', 'https://www.github.com/alex'],
    ['linkedin', 'https://br.linkedin.com/in/alex'],
    ['instagram', 'https://instagram.com/alex'],
  ] as const)('accepts %s %s', (network, url) => {
    expect(validateLink(network, url).ok).toBe(true)
  })

  it.each([
    ['github', 'http://github.com/alex'], // not https
    ['github', 'https://evilgithub.com/alex'], // lookalike host
    ['github', 'https://github.com.evil.io/alex'],
    ['github', 'https://user:pass@github.com/alex'], // credentials
    ['github', 'https://github.com:8443/alex'], // port
    ['github', 'javascript:alert(1)'],
    ['linkedin', 'https://github.com/alex'], // wrong network
    ['instagram', 'not a url'],
    ['github', `https://github.com/${'a'.repeat(250)}`],
    ['github', 42],
  ] as const)('rejects %s %s', (network, url) => {
    expect(validateLink(network, url).ok).toBe(false)
  })

  it('treats empty and null as "remove"', () => {
    expect(validateLink('github', '')).toEqual({ ok: true, value: null })
    expect(validateLink('github', null)).toEqual({ ok: true, value: null })
  })
})

describe('validateProfilePatch', () => {
  const now = new Date('2026-10-20')

  it('accepts a full valid patch and maps to column names', () => {
    const result = validateProfilePatch({
      bio: ' Oi! ', course: 'Sistemas de Informacao', entryYear: 2024, showCourses: 'connections', showConnections: 'none',
      links: { github: 'https://github.com/alex', linkedin: '' },
    }, now)
    expect(result).toEqual({
      ok: true,
      value: { bio: 'Oi!', course: 'Sistemas de Informacao', entry_year: 2024, show_courses: 'connections', show_connections: 'none', links: { github: 'https://github.com/alex' } },
    })
  })

  it.each([
    [{}, 'empty'],
    [{ handle: 'novo' }, 'unknown/immutable field'],
    [{ bio: 'x'.repeat(281) }, 'bio too long'],
    [{ bio: 5 }, 'bio type'],
    [{ course: '' }, 'empty course'],
    [{ course: 'c'.repeat(81) }, 'course too long'],
    [{ entryYear: 1800 }, 'year too old'],
    [{ entryYear: 2040 }, 'year in the future'],
    [{ entryYear: 2024.5 }, 'non-integer year'],
    [{ entryYear: '2024' }, 'year as string'],
    [{ showCourses: 'everyone' }, 'bad enum'],
    [{ showConnections: null }, 'null enum'],
    [{ links: { twitter: 'https://x.com/a' } }, 'unknown network'],
    [{ links: { github: 'http://github.com/a' } }, 'bad link'],
    [{ links: [] }, 'links as array'],
  ] as [unknown, string][])('rejects %j (%s)', (body, _label) => {
    expect(validateProfilePatch(body, now).ok).toBe(false)
  })

  it('rejects non-object bodies', () => {
    expect(validateProfilePatch(null).ok).toBe(false)
    expect(validateProfilePatch('x').ok).toBe(false)
    expect(validateProfilePatch([]).ok).toBe(false)
  })

  it('clears bio and year with empty/null', () => {
    expect(validateProfilePatch({ bio: '   ', entryYear: null }, now)).toEqual({ ok: true, value: { bio: null, entry_year: null } })
  })
})
