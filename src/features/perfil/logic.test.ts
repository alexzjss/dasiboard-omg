import { describe, expect, it } from 'vitest'
import type { MyProfile } from '../../lib/socialApi'
import { visitorView } from './logic'

const me: MyProfile = {
  profile: {
    handle: 'alex', name: 'Alex', email: 'alex@usp.br', picture: null, hasCustomAvatar: false, bio: null, course: 'Sistemas de Informação',
    entryYear: 2024, links: {}, technologies: [], showCourses: 'all', showConnections: 'all',
  },
  entities: [{ entityId: 'dasi', name: 'DASI', role: 'member', joinedAt: '2026-10-20T00:00:00Z', title: 'Tesoureira' }],
  badges: [
    { kind: 'entity_member', sourceId: 'dasi', label: 'DASI', icon: null, color: null, entityId: 'dasi' },
    { kind: 'admin_award', sourceId: 'monitor', label: 'Monitor', icon: 'star', color: '#e8b021', entityId: null },
  ],
  adminOf: [], isSuperadmin: false, courses: [], pendingCount: 0, pendingRequests: [],
}

describe('visitorView', () => {
  it('usa todas as badges do próprio perfil, inclusive as que não são de entidade', () => {
    expect(visitorView(me, []).badges).toEqual(me.badges)
  })

  it('mostra tecnologias e o cargo nas entidades', () => {
    const view = visitorView({ ...me, profile: { ...me.profile, technologies: ['react'] } }, [])
    expect(view.profile.technologies).toEqual(['react'])
    expect(view.entities).toEqual([{ entityId: 'dasi', name: 'DASI', title: 'Tesoureira' }])
  })
})
