import type { User } from '../auth/types'

export function getInitials(user: User) {
  return user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}
