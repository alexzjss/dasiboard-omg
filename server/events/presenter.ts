import { getEntitiesByIds, getPeopleByIds, getRsvpSummary, listMyReports } from '../social/db.js'
import { canCancel, canEdit, canModerate, canReport } from './rules.js'
import type { EventActor, EventRecord } from './types.js'

export type EventExtras = {
  people: ReadonlyMap<string, { name: string; handle: string }>
  entityNames: ReadonlyMap<string, string>
  reported: ReadonlySet<string>
  rsvps: ReadonlyMap<string, { going: number; interested: number; mine: 'going' | 'interested' | null }>
}

export type ReviewKind = 'new' | 'edit' | 'reported'

export function toEventDto(event: EventRecord, actor: EventActor, extras: EventExtras) {
  const isAuthor = event.createdBy !== null && event.createdBy === actor.userId
  const moderator = canModerate(actor, event)
  const privileged = isAuthor || moderator
  const value = event.scopeValue
  const reportedByMe = extras.reported.has(event.id)
  let scopeLabel = value ?? 'USP'
  if (event.scope === 'usp') scopeLabel = 'USP'
  else if (event.scope === 'entity') scopeLabel = (value && extras.entityNames.get(value)) || value || ''
  else if (event.scope === 'cohort') scopeLabel = `Turma de ${value}`
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    scope: event.scope,
    scopeValue: value,
    scopeLabel,
    visibility: event.visibility,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    location: event.location,
    link: event.link,
    status: event.status,
    source: event.source,
    createdAt: event.createdAt,
    author: event.createdBy ? extras.people.get(event.createdBy) ?? null : null,
    pendingChanges: privileged ? event.pendingChanges : null,
    reviewNote: privileged ? event.reviewNote : null,
    permissions: { edit: canEdit(actor, event), cancel: canCancel(actor, event), report: canReport(actor, event) && !reportedByMe, moderate: moderator },
    reportedByMe,
    rsvp: extras.rsvps.get(event.id) ?? { going: 0, interested: 0, mine: null },
  }
}

export type EventDto = ReturnType<typeof toEventDto>

export function reviewKindOf(event: EventRecord): ReviewKind {
  if (event.status === 'pending') return 'new'
  return event.status === 'hidden' ? 'reported' : 'edit'
}

// Batch-loads authors, entity names and the viewer's own reports for a list of events.
export async function presentEvents(events: EventRecord[], actor: EventActor): Promise<EventDto[]> {
  if (events.length === 0) return []
  const authorIds = [...new Set(events.flatMap((e) => (e.createdBy ? [e.createdBy] : [])))]
  const entityIds = [...new Set(events.flatMap((e) => (e.scope === 'entity' && e.scopeValue ? [e.scopeValue] : [])))]
  const classEventIds = events.filter((e) => e.scope === 'class').map((e) => e.id)
  const [people, entities, reported, rsvps] = await Promise.all([
    authorIds.length > 0 ? getPeopleByIds(authorIds) : [],
    entityIds.length > 0 ? getEntitiesByIds(entityIds) : [],
    classEventIds.length > 0 ? listMyReports(actor.userId, classEventIds) : [],
    getRsvpSummary(events.map((e) => e.id), actor.userId),
  ])
  const extras: EventExtras = {
    people: new Map(people.map((p) => [p.user.id, { name: p.user.name, handle: p.profile.handle }])),
    entityNames: new Map(entities.map((e) => [e.id, e.name])),
    reported: new Set(reported),
    rsvps,
  }
  return events.map((event) => toEventDto(event, actor, extras))
}
