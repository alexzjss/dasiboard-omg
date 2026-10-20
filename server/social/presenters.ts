import type { BadgeRow, PersonRecord } from './db.js'
import type { ConnectionState } from './privacy.js'

// Whitelists of what leaves the server. Never include email or ids of other students.
export const personMini = ({ user, profile }: PersonRecord) => ({ handle: profile.handle, name: user.name, picture: user.picture })

export const personCard = (person: PersonRecord, badges: BadgeRow[], connection: ConnectionState, commonCourses: number | null) => ({
  ...personMini(person),
  course: person.profile.course,
  entryYear: person.profile.entry_year,
  badges,
  connection,
  commonCourses,
})
