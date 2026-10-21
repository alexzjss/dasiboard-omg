import type { EventActor, EventFields, EventRecord, EventStatus, ScopeRef } from './types.js'

export type ReviewDecision = 'approve' | 'reject' | 'restore' | 'remove'
export type ReviewableFields = NonNullable<EventRecord['pendingChanges']>

const isAuthor = (actor: EventActor, event: EventRecord) => event.createdBy !== null && event.createdBy === actor.userId

export function canSubmit(actor: EventActor, ref: ScopeRef): boolean {
  if (actor.isSuperadmin) return true
  const value = ref.scopeValue
  switch (ref.scope) {
    case 'usp': return true
    case 'campus': return value !== null && actor.campus === value
    case 'course': return value !== null && actor.course === value
    case 'cohort': return value !== null && actor.entryYear !== null && String(actor.entryYear) === value
    case 'class': return value !== null && actor.classCodes.has(value)
    case 'entity': return value !== null && actor.memberships.has(value)
  }
}

// Em `class` só o superadmin "modera" (e na prática só denúncias).
export function canModerate(actor: EventActor, ref: ScopeRef): boolean {
  if (actor.isSuperadmin) return true
  return ref.scope === 'entity' && ref.scopeValue !== null && actor.memberships.get(ref.scopeValue) === 'admin'
}

export function initialStatus(actor: EventActor, ref: ScopeRef): 'pending' | 'approved' {
  return ref.scope === 'class' || canModerate(actor, ref) ? 'approved' : 'pending'
}

export function canView(actor: EventActor, event: EventRecord, opts: { otherClasses: boolean }): boolean {
  if (isAuthor(actor, event) || canModerate(actor, event)) return true
  if (event.status !== 'approved') return false
  if (event.scope === 'class') return (event.scopeValue !== null && actor.classCodes.has(event.scopeValue)) || opts.otherClasses
  if (event.scope === 'entity' && event.visibility === 'members') return event.scopeValue !== null && actor.memberships.has(event.scopeValue)
  return true
}

export function canReport(actor: EventActor, event: EventRecord): boolean {
  return event.scope === 'class' && event.status === 'approved' && event.scopeValue !== null
    && actor.classCodes.has(event.scopeValue) && !isAuthor(actor, event)
}

export function canEdit(actor: EventActor, event: EventRecord): boolean {
  if (event.status === 'cancelled' || event.status === 'rejected') return false
  const moderator = canModerate(actor, event)
  if (event.status === 'hidden') return moderator
  return moderator || isAuthor(actor, event)
}

export const canCancel = canEdit

const DIRECT_KEYS = ['description', 'location', 'link', 'visibility'] as const
const REVIEW_KEYS = ['title', 'kind', 'startsAt', 'endsAt', 'allDay'] as const

function changed(key: keyof EventFields, current: EventFields[keyof EventFields], next: unknown): boolean {
  if ((key === 'startsAt' || key === 'endsAt') && typeof current === 'string' && typeof next === 'string') {
    return Date.parse(current) !== Date.parse(next)
  }
  return current !== next
}

// P7: texto livre muda direto; título/tipo/data de evento aprovado e moderado esperam revisão.
export function splitEdit(event: EventRecord, patch: Partial<EventFields>, actor: EventActor): { direct: Partial<EventFields>; needsReview: ReviewableFields | null } {
  const gated = event.status === 'approved' && event.scope !== 'class' && !canModerate(actor, event)
  const direct: Record<string, unknown> = {}
  const review: Record<string, unknown> = {}
  for (const key of DIRECT_KEYS) {
    if (key in patch && patch[key] !== undefined && changed(key, event[key], patch[key])) direct[key] = patch[key]
  }
  for (const key of REVIEW_KEYS) {
    if (!(key in patch) || patch[key] === undefined || !changed(key, event[key], patch[key])) continue
    ;(gated ? review : direct)[key] = patch[key]
  }
  return { direct: direct as Partial<EventFields>, needsReview: Object.keys(review).length > 0 ? (review as ReviewableFields) : null }
}

export function reviewTransition(event: Pick<EventRecord, 'status' | 'pendingChanges'>, decision: ReviewDecision): EventStatus | null {
  switch (decision) {
    case 'approve':
      if (event.status === 'pending') return 'approved'
      return event.status === 'approved' && event.pendingChanges !== null ? 'approved' : null
    case 'reject':
      if (event.status === 'pending') return 'rejected'
      // edição pendente recusada: descarta a edição, o evento segue aprovado
      return event.status === 'approved' && event.pendingChanges !== null ? 'approved' : null
    case 'restore': return event.status === 'hidden' ? 'approved' : null
    case 'remove': return event.status === 'hidden' ? 'cancelled' : null
  }
}
