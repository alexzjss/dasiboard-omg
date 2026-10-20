import { MAX_CARD_ITEMS, type CardSettings } from './cardOptions.js'
import type { BadgeRow, Links, PersonRecord } from './db.js'
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

export type CardData = {
  handle: string
  name: string
  picture: string | null
  subtitle: string
  course: string
  entryYear: number | null
  technologies: string[]
  links: Links
  entities: { entityId: string; name: string; title: string | null }[]
  badges: BadgeRow[]
  settings: CardSettings
  viewer: { collected: boolean; connection: ConnectionState } | null
}

export type CardInput = {
  person: PersonRecord
  badges: BadgeRow[]
  memberships: { entityId: string; name: string; title: string | null }[]
  settings: CardSettings
  viewer?: CardData['viewer']
}

export const badgeKey = (badge: { kind: string; sourceId: string }) => `${badge.kind}:${badge.sourceId}`

// Whitelist do que sai na carta. Seleções que deixaram de valer (saiu da entidade, badge revogada) são descartadas.
export function cardData({ person, badges, memberships, settings, viewer }: CardInput): CardData {
  const extras = badges.filter((badge) => badge.kind !== 'entity_member')
  const byEntity = new Map(memberships.map((membership) => [membership.entityId, membership]))
  const chosenEntities = settings.entities.length === 0 ? memberships.slice(0, 2) : settings.entities.flatMap((id) => byEntity.get(id) ?? [])
  const byKey = new Map(extras.map((badge) => [badgeKey(badge), badge]))
  const chosenBadges = (settings.badges.length === 0 ? extras.slice(-3).reverse() : settings.badges.flatMap((key) => byKey.get(key) ?? [])).slice(0, MAX_CARD_ITEMS)
  const entities = chosenEntities.slice(0, MAX_CARD_ITEMS).map(({ entityId, name, title }) => ({ entityId, name, title }))
  const main = entities[0]
  const { course, entry_year: entryYear } = person.profile
  return {
    handle: person.profile.handle,
    name: person.user.name,
    picture: person.user.picture,
    subtitle: main?.title ? `${main.title} · ${main.name}` : entryYear ? `${course} · Turma ${entryYear}` : course,
    course,
    entryYear,
    technologies: person.profile.technologies,
    links: person.profile.links,
    entities,
    badges: chosenBadges,
    settings: { ...settings, entities: entities.map((entity) => entity.entityId), badges: chosenBadges.map(badgeKey) },
    viewer: viewer ?? null,
  }
}
