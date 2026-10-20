// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { computeAutoBadges, type AchievementStats } from './achievements.js'

const base: AchievementStats = { profileComplete: false, connections: 0, scheduleImported: false, collected: 0, entryYear: null, course: '' }
const ids = (stats: Partial<AchievementStats>) => computeAutoBadges({ ...base, ...stats }).map((b) => b.sourceId)

describe('computeAutoBadges', () => {
  it('concede connections-10 mas não connections-50 com 12 conexões', () => {
    const result = ids({ connections: 12 })
    expect(result).toContain('connections-10')
    expect(result).not.toContain('connections-50')
  })

  it('cria badges de turma e de curso', () => {
    const badges = computeAutoBadges({ ...base, entryYear: 2024, course: 'Sistemas de Informação' })
    expect(badges).toContainEqual(expect.objectContaining({ kind: 'cohort', sourceId: 'year-2024', label: 'Turma 2024' }))
    expect(badges).toContainEqual(expect.objectContaining({ kind: 'cohort', sourceId: 'course-sistemas-de-informacao', label: 'Sistemas de Informação' }))
  })

  it('não concede perfil completo sem os requisitos', () => {
    expect(ids({ profileComplete: false })).not.toContain('profile-complete')
    expect(ids({ profileComplete: true })).toContain('profile-complete')
  })

  it('concede grade importada e colecionador', () => {
    expect(ids({ scheduleImported: true })).toContain('schedule-imported')
    expect(ids({ collected: 10 })).toEqual(['collector-10'])
    expect(ids({ collected: 50 })).toEqual(['collector-10', 'collector-50'])
  })
})
