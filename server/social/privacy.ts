// Single place that decides what a viewer may see of another student's profile.
// Every profile read (profile page, people list, feed, common classmates) goes through canSee.

export type Visibility = 'all' | 'connections' | 'none'

// 'pending' = a request exists in either direction, but it is not accepted yet.
export type Relation = 'self' | 'connected' | 'pending' | 'none'

// 'profile' / 'basic' / 'entities' are always visible to a logged-in viewer
// (name, photo, course and entities). 'courses' and 'connections' obey the owner's choice.
export type ProfileItem = 'profile' | 'basic' | 'entities' | 'courses' | 'connections'

export type PrivacyOwner = { id: string; showCourses: Visibility; showConnections: Visibility }
export type PrivacyViewer = { id: string } | null

export function canSee(viewer: PrivacyViewer, owner: PrivacyOwner, item: ProfileItem, relation: Relation): boolean {
  if (!viewer) return false
  if (viewer.id === owner.id || relation === 'self') return true
  let level: Visibility
  switch (item) {
    case 'profile':
    case 'basic':
    case 'entities':
      return true
    case 'courses':
      level = owner.showCourses
      break
    case 'connections':
      level = owner.showConnections
      break
    default:
      return false
  }
  if (level === 'all') return true
  if (level === 'connections') return relation === 'connected'
  return false // 'none' and any unknown value fail closed
}

export type ConnectionRow = { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' }

export function relationBetween(viewerId: string, ownerId: string, connection: ConnectionRow | null | undefined): Relation {
  if (viewerId === ownerId) return 'self'
  if (!connection) return 'none'
  return connection.status === 'accepted' ? 'connected' : 'pending'
}

// What the UI needs to draw the connect button.
export type ConnectionState = 'self' | 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export function connectionState(viewerId: string, ownerId: string, connection: ConnectionRow | null | undefined): ConnectionState {
  if (viewerId === ownerId) return 'self'
  if (!connection) return 'none'
  if (connection.status === 'accepted') return 'accepted'
  return connection.requester_id === viewerId ? 'pending_sent' : 'pending_received'
}
