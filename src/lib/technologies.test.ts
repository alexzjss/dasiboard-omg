import { describe, expect, it } from 'vitest'
import { TECH_IDS } from '../../server/social/technologies'
import { MAX_TECHNOLOGIES, TECHNOLOGIES, loadTechIcon } from './technologies'

describe('TECHNOLOGIES', () => {
  it('has unique kebab-case ids that match the server list exactly', () => {
    const ids = TECHNOLOGIES.map((tech) => tech.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true)
    expect([...ids].sort()).toEqual([...TECH_IDS].sort())
  })

  it('caps picks at 12', () => {
    expect(MAX_TECHNOLOGIES).toBe(12)
  })

  it('loads the svg path of an icon on demand, null for unknown or icon-less ids', async () => {
    expect(await loadTechIcon('react')).toMatch(/^M/)
    expect(await loadTechIcon('java')).toBeNull()
    expect(await loadTechIcon('nao-existe')).toBeNull()
  })
})
