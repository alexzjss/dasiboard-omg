// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canSee, connectionState, relationBetween, type PrivacyOwner, type Relation, type Visibility } from './privacy.js'

const viewer = { id: 'viewer' }
const ownerWith = (showCourses: Visibility, showConnections: Visibility = 'all'): PrivacyOwner => ({ id: 'owner', showCourses, showConnections })

// level x relation -> can the viewer see the item?
const matrix: [Visibility, Record<Relation, boolean>][] = [
  ['all', { self: true, connected: true, pending: true, none: true }],
  ['connections', { self: true, connected: true, pending: false, none: false }],
  ['none', { self: true, connected: false, pending: false, none: false }],
]

describe('canSee', () => {
  for (const [level, expected] of matrix) {
    for (const relation of Object.keys(expected) as Relation[]) {
      it(`courses=${level}, relation=${relation} -> ${expected[relation]}`, () => {
        // the owner is the viewer only for the 'self' relation
        const who = relation === 'self' ? { id: 'owner' } : viewer
        expect(canSee(who, ownerWith(level), 'courses', relation)).toBe(expected[relation])
      })
      it(`connections=${level}, relation=${relation} -> ${expected[relation]}`, () => {
        const who = relation === 'self' ? { id: 'owner' } : viewer
        expect(canSee(who, ownerWith('all', level), 'connections', relation)).toBe(expected[relation])
      })
    }
  }

  it('courses and connections are independent settings', () => {
    const owner = ownerWith('none', 'all')
    expect(canSee(viewer, owner, 'courses', 'connected')).toBe(false)
    expect(canSee(viewer, owner, 'connections', 'none')).toBe(true)
  })

  it('profile, basic data and entities are visible to any logged-in viewer', () => {
    const owner = ownerWith('none', 'none')
    for (const item of ['profile', 'basic', 'entities'] as const) expect(canSee(viewer, owner, item, 'none')).toBe(true)
  })

  it('a missing viewer sees nothing, not even the owner profile', () => {
    expect(canSee(null, ownerWith('all', 'all'), 'profile', 'none')).toBe(false)
    expect(canSee(null, ownerWith('all', 'all'), 'courses', 'connected')).toBe(false)
  })

  it('fails closed on an unknown visibility value or item', () => {
    expect(canSee(viewer, ownerWith('bogus' as Visibility), 'courses', 'connected')).toBe(false)
    expect(canSee(viewer, ownerWith('all'), 'secret' as never, 'connected')).toBe(false)
  })
})

describe('relationBetween / connectionState', () => {
  const pendingSent = { requester_id: 'viewer', addressee_id: 'owner', status: 'pending' as const }
  const pendingReceived = { requester_id: 'owner', addressee_id: 'viewer', status: 'pending' as const }
  const accepted = { requester_id: 'owner', addressee_id: 'viewer', status: 'accepted' as const }

  it('maps rows to relations', () => {
    expect(relationBetween('viewer', 'viewer', null)).toBe('self')
    expect(relationBetween('viewer', 'owner', null)).toBe('none')
    expect(relationBetween('viewer', 'owner', pendingSent)).toBe('pending')
    expect(relationBetween('viewer', 'owner', pendingReceived)).toBe('pending')
    expect(relationBetween('viewer', 'owner', accepted)).toBe('connected')
  })

  it('tells who sent a pending request', () => {
    expect(connectionState('viewer', 'owner', pendingSent)).toBe('pending_sent')
    expect(connectionState('viewer', 'owner', pendingReceived)).toBe('pending_received')
    expect(connectionState('viewer', 'owner', accepted)).toBe('accepted')
    expect(connectionState('viewer', 'owner', null)).toBe('none')
    expect(connectionState('viewer', 'viewer', null)).toBe('self')
  })
})
