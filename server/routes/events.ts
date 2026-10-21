import { Router, type Response } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { presentEvents, reviewKindOf } from '../events/presenter.js'
import { canCancel, canEdit, canModerate, canReport, canSubmit, canView, initialStatus, reviewTransition, splitEdit } from '../events/rules.js'
import { DAILY_SUBMISSION_LIMIT, REPORT_THRESHOLD, type EventActor, type EventFields, type EventRecord, type ScopeRef } from '../events/types.js'
import { validateEventInput, validateEventPatch, validateRange, validateReport, validateReview, validateRsvp } from '../events/validation.js'
import {
  cancelEvent, clearEventReports, countEventsCreatedSince, createEvent, decideEvent, findEventModeratorIds, getEntitiesByIds, getEntity, getEvent, getEventActor,
  getRsvpSummary, hideEventIfApproved, listEventsInRange, listMyEvents, listReviewQueue, reportEvent, setRsvp, updateEventFields,
} from '../social/db.js'
import { loadViewer, viewerOf } from '../social/guards.js'
import { notify } from '../social/notify.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer, rateLimit('events', 30, 10 * 60_000)]
const DAY_MS = 24 * 60 * 60_000
const MAX_DURATION_MS = 31 * DAY_MS
const NOT_FOUND = { error: 'Evento não encontrado' }
const DENIED = { error: 'Acesso negado' }

const actorOf = (res: Response) => { const viewer = viewerOf(res); return getEventActor(viewer.id, viewer.isSuperadmin) }
const moderatedEntityIds = (actor: EventActor) => [...actor.memberships].filter(([, role]) => role === 'admin').map(([id]) => id)
const entityIdOf = (ref: ScopeRef) => (ref.scope === 'entity' ? ref.scopeValue : null)
const moderatesSomething = (actor: EventActor) => actor.isSuperadmin || moderatedEntityIds(actor).length > 0

// The validator can't know the stored values: re-check ordering and duration on the effective result.
function checkEffective(event: EventRecord, fields: Partial<EventFields>): string | null {
  if (fields.visibility === 'members' && event.scope !== 'entity') return 'Só eventos de entidade podem ser restritos a membros'
  const startsAt = fields.startsAt ?? event.startsAt
  const endsAt = fields.endsAt !== undefined ? fields.endsAt : event.endsAt
  if (!endsAt) return null
  const span = Date.parse(endsAt) - Date.parse(startsAt)
  if (span < 0) return 'O fim não pode ser antes do início'
  if (span > MAX_DURATION_MS) return 'O evento pode durar no máximo 31 dias'
  return null
}

// Loads the event for an actor; null means "answer 404" (missing or not visible: never leak existence).
async function loadVisible(id: string, actor: EventActor, otherClasses = false): Promise<EventRecord | null> {
  const event = await getEvent(id)
  return event && canView(actor, event, { otherClasses }) ? event : null
}

router.get('/api/events', ...authed, route('Listing events failed', async (req, res) => {
  const range = validateRange(req.query.from, req.query.to)
  if (!range.ok) return res.status(400).json({ error: range.error })
  const viewer = viewerOf(res)
  const actor = await actorOf(res)
  const otherClasses = req.query.otherClasses === '1'
  const found = await listEventsInRange(range.value.from, range.value.to, {
    classCodes: [...actor.classCodes], entityIds: [...actor.memberships.keys()], includeOtherClasses: otherClasses,
    viewerId: viewer.id, moderatesAll: actor.isSuperadmin, moderatedEntityIds: moderatedEntityIds(actor),
  })
  const visible = found.filter((e) => (e.status === 'approved' || e.status === 'pending' || e.status === 'hidden') && canView(actor, e, { otherClasses }))
  res.json({ events: await presentEvents(visible, actor) })
}))

router.get('/api/events/scopes', ...authed, route('Listing event scopes failed', async (_req, res) => {
  const actor = await actorOf(res)
  const entries: { scope: ScopeRef['scope']; scopeValue: string | null; label: string }[] = [{ scope: 'usp', scopeValue: null, label: 'USP' }]
  if (actor.campus) entries.push({ scope: 'campus', scopeValue: actor.campus, label: actor.campus })
  if (actor.course) entries.push({ scope: 'course', scopeValue: actor.course, label: actor.course })
  if (actor.entryYear !== null) entries.push({ scope: 'cohort', scopeValue: String(actor.entryYear), label: `Turma de ${actor.entryYear}` })
  for (const code of [...actor.classCodes].sort()) entries.push({ scope: 'class', scopeValue: code, label: code })
  const entities = await getEntitiesByIds([...actor.memberships.keys()])
  for (const entity of [...entities].sort((a, b) => a.name.localeCompare(b.name))) entries.push({ scope: 'entity', scopeValue: entity.id, label: entity.name })
  res.json({ scopes: entries.filter((e) => canSubmit(actor, e)).map((e) => ({ ...e, moderated: initialStatus(actor, e) === 'pending' })) })
}))

router.get('/api/events/mine', ...authed, route('Listing my events failed', async (_req, res) => {
  const actor = await actorOf(res)
  res.json({ events: await presentEvents(await listMyEvents(actor.userId), actor) })
}))

async function reviewQueue(actor: EventActor) {
  const queue = await listReviewQueue({ all: actor.isSuperadmin, entityIds: moderatedEntityIds(actor) }, new Date().toISOString())
  return queue.filter((e) => canModerate(actor, e))
}

router.get('/api/events/review', ...authed, route('Listing review queue failed', async (_req, res) => {
  const actor = await actorOf(res)
  if (!moderatesSomething(actor)) return res.status(403).json(DENIED)
  const queue = await reviewQueue(actor)
  const dtos = await presentEvents(queue, actor)
  res.json({ events: dtos.map((dto, i) => ({ ...dto, reviewKind: reviewKindOf(queue[i]) })) })
}))

router.get('/api/events/review/count', ...authed, route('Counting review queue failed', async (_req, res) => {
  const actor = await actorOf(res)
  const moderates = moderatesSomething(actor)
  res.json({ count: moderates ? (await reviewQueue(actor)).length : 0, moderates })
}))

router.get('/api/events/:id', ...authed, route('Loading event failed', async (req, res) => {
  const actor = await actorOf(res)
  const event = await loadVisible(String(req.params.id ?? ''), actor, req.query.otherClasses === '1')
  if (!event) return res.status(404).json(NOT_FOUND)
  res.json({ event: (await presentEvents([event], actor))[0] })
}))

router.post('/api/events', ...authedWrite, route('Creating event failed', async (req, res) => {
  const viewer = viewerOf(res)
  const parsed = validateEventInput(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const { scope, scopeValue, ...fields } = parsed.value
  const ref: ScopeRef = { scope, scopeValue }
  const actor = await actorOf(res)
  if (!canSubmit(actor, ref)) return res.status(403).json({ error: 'Você só pode propor eventos onde participa' })
  if (scope === 'entity' && !(await getEntity(scopeValue ?? ''))) return res.status(400).json({ error: 'Entidade inválida' })
  const moderator = canModerate(actor, ref)
  if (!moderator && (await countEventsCreatedSince(viewer.id, new Date(Date.now() - DAY_MS).toISOString())) >= DAILY_SUBMISSION_LIMIT) {
    return res.status(429).json({ error: 'Limite de 10 eventos por dia' })
  }
  const status = initialStatus(actor, ref)
  const event = await createEvent({ ...ref, ...fields, status, createdBy: viewer.id, reviewedBy: status === 'approved' && moderator ? viewer.id : null })
  if (status === 'pending') {
    await notify(await findEventModeratorIds(ref), { type: 'event_submitted', actorId: viewer.id, entityId: entityIdOf(ref), payload: { eventId: event.id, title: event.title } }, { excludeId: viewer.id })
  }
  res.status(201).json({ event: (await presentEvents([event], actor))[0] })
}))

router.patch('/api/events/:id', ...authedWrite, route('Updating event failed', async (req, res) => {
  const viewer = viewerOf(res)
  const actor = await actorOf(res)
  const event = await loadVisible(String(req.params.id ?? ''), actor)
  if (!event) return res.status(404).json(NOT_FOUND)
  if (!canEdit(actor, event)) return res.status(403).json(DENIED)
  const parsed = validateEventPatch(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  // Effective values include an edit already waiting for review.
  const effective: EventRecord = { ...event, ...(event.pendingChanges ?? {}) }
  const invalid = checkEffective(effective, parsed.value)
  if (invalid) return res.status(400).json({ error: invalid })
  const { direct, needsReview } = splitEdit(event, parsed.value, actor)
  const saved = await updateEventFields(event.id, direct, needsReview ?? undefined)
  if (!saved) return res.status(404).json(NOT_FOUND)
  if (needsReview) {
    await notify(await findEventModeratorIds(event), {
      type: 'event_submitted', actorId: viewer.id, entityId: entityIdOf(event), payload: { eventId: event.id, title: needsReview.title ?? effective.title, editOnly: true },
    }, { excludeId: viewer.id })
  }
  res.json({ event: (await presentEvents([saved], actor))[0] })
}))

router.post('/api/events/:id/cancel', ...authedWrite, route('Cancelling event failed', async (req, res) => {
  const actor = await actorOf(res)
  const event = await loadVisible(String(req.params.id ?? ''), actor)
  if (!event) return res.status(404).json(NOT_FOUND)
  if (!canCancel(actor, event)) return res.status(403).json(DENIED)
  if (!(await cancelEvent(event.id))) return res.status(409).json({ error: 'O evento já não está ativo' })
  res.status(204).end()
}))

router.post('/api/events/:id/review', ...authedWrite, route('Reviewing event failed', async (req, res) => {
  const viewer = viewerOf(res)
  const actor = await actorOf(res)
  const event = await getEvent(String(req.params.id ?? ''))
  if (!event || !canModerate(actor, event)) return res.status(404).json(NOT_FOUND)
  const parsed = validateReview(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const { decision, note, changes } = parsed.value
  const target = reviewTransition(event, decision)
  if (!target) return res.status(409).json({ error: 'Esse evento não pode receber essa decisão agora' })

  const editing = event.status === 'approved' && event.pendingChanges !== null
  const base = { reviewedBy: viewer.id, reviewNote: note }
  let fields: Partial<EventFields> | undefined
  if (decision === 'approve') {
    fields = { ...(editing ? event.pendingChanges : {}), ...(changes ?? {}) }
    const invalid = checkEffective({ ...event, ...fields }, fields)
    if (invalid) return res.status(400).json({ error: invalid })
  }
  const decided = await decideEvent(event.id, event.status, {
    status: target, fields: decision === 'approve' ? fields : undefined, clearPendingChanges: editing, ...base,
  })
  if (!decided) return res.status(409).json({ error: 'Outra pessoa já decidiu esse evento' })
  if (decision === 'restore') await clearEventReports(event.id)

  const recipients = decided.createdBy ? [decided.createdBy] : []
  const common = { actorId: viewer.id, entityId: entityIdOf(event) }
  const payload = { eventId: event.id, title: decided.title }
  if (decision === 'approve') {
    await notify(recipients, { type: 'event_approved', ...common, payload: editing ? { ...payload, editOnly: true } : { ...payload, adjusted: changes !== null } }, { excludeId: viewer.id })
  } else if (decision === 'reject') {
    await notify(recipients, { type: 'event_rejected', ...common, payload: { ...payload, ...(note ? { note } : {}), ...(editing ? { editOnly: true } : {}) } }, { excludeId: viewer.id })
  }
  res.json({ event: (await presentEvents([decided], actor))[0] })
}))

router.post('/api/events/:id/report', ...authedWrite, route('Reporting event failed', async (req, res) => {
  const viewer = viewerOf(res)
  const actor = await actorOf(res)
  const event = await loadVisible(String(req.params.id ?? ''), actor)
  if (!event) return res.status(404).json(NOT_FOUND)
  const parsed = validateReport(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (!canReport(actor, event)) return res.status(403).json(DENIED)
  const { inserted, total } = await reportEvent(event.id, viewer.id, parsed.value.reason)
  let hidden = false
  if (inserted && total >= REPORT_THRESHOLD && (await hideEventIfApproved(event.id))) {
    hidden = true
    const payload = { eventId: event.id, title: event.title }
    await notify(event.createdBy ? [event.createdBy] : [], { type: 'event_hidden', entityId: null, payload }, { excludeId: viewer.id })
    await notify(await findEventModeratorIds({ scope: 'usp', scopeValue: null }), { type: 'event_hidden', entityId: null, payload: { ...payload, forModerator: true } }, { excludeId: viewer.id })
  }
  res.json({ reported: true, hidden })
}))

router.put('/api/events/:id/rsvp', ...authedWrite, route('Saving RSVP failed', async (req, res) => {
  const viewer = viewerOf(res)
  const actor = await actorOf(res)
  const event = await loadVisible(String(req.params.id ?? ''), actor)
  if (!event) return res.status(404).json(NOT_FOUND)
  const parsed = validateRsvp(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (event.status !== 'approved') return res.status(409).json({ error: 'Só dá para confirmar presença em eventos aprovados' })
  if (Date.parse(event.endsAt ?? event.startsAt) < Date.now()) return res.status(409).json({ error: 'Esse evento já passou' })
  await setRsvp(event.id, viewer.id, parsed.value.status)
  const summary = (await getRsvpSummary([event.id], viewer.id)).get(event.id) ?? { going: 0, interested: 0, mine: null }
  res.json({ rsvp: summary })
}))

export default router
