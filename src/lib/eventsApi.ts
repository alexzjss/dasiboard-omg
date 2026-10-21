// Cliente tipado da API de eventos do calendário (server/routes/events.ts).
// Os tipos espelham o presenter do servidor (server/events/presenter.ts): só o que ele de fato devolve.
import { request } from './socialApi'

export type EventKind = 'event' | 'meeting' | 'exam' | 'assignment' | 'deadline' | 'holiday'
export type EventScope = 'usp' | 'campus' | 'course' | 'cohort' | 'class' | 'entity'
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hidden'
export type EventVisibility = 'public' | 'members'
export type ReviewKind = 'new' | 'edit' | 'reported'
export type ReviewDecision = 'approve' | 'reject' | 'restore' | 'remove'

export const KIND_LABEL: Record<EventKind, string> = {
  event: 'Evento',
  meeting: 'Reunião',
  exam: 'Prova',
  assignment: 'Entrega',
  deadline: 'Prazo',
  holiday: 'Feriado/sem aula',
}

/** Campos de data e texto de um evento, como o servidor os guarda (datas em ISO com offset). */
export type EventFields = {
  title: string
  description: string | null
  kind: EventKind
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  link: string | null
  visibility: EventVisibility
}

export type RsvpStatus = 'going' | 'interested'
export type EventRsvp = { going: number; interested: number; mine: RsvpStatus | null }

export type EventDto = {
  id: string
  title: string
  description: string | null
  kind: EventKind
  scope: EventScope
  scopeValue: string | null
  scopeLabel: string
  visibility: EventVisibility
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  link: string | null
  status: EventStatus
  source: 'user' | 'usp_import'
  createdAt: string
  author: { name: string; handle: string } | null
  /** Edição aguardando revisão. Só vem para o autor e para moderadores. */
  pendingChanges: Partial<Pick<EventFields, 'title' | 'kind' | 'startsAt' | 'endsAt' | 'allDay'>> | null
  reviewNote: string | null
  permissions: { edit: boolean; cancel: boolean; report: boolean; moderate: boolean }
  reportedByMe: boolean
  /** Só contagens; a API nunca diz quem vai. */
  rsvp: EventRsvp
}

/** Item da fila de moderação (GET /api/events/review). */
export type ReviewEventDto = EventDto & { reviewKind: ReviewKind }

/** Escopo em que o usuário pode propor eventos (GET /api/events/scopes). */
export type EventScopeOption = {
  scope: EventScope
  scopeValue: string | null
  label: string
  /** true quando o evento proposto nesse escopo precisa de aprovação. */
  moderated: boolean
}

/** Corpo do POST. Com `allDay`, as datas vão como YYYY-MM-DD; sem ele, como ISO com offset. */
export type EventInput = {
  scope: EventScope
  scopeValue?: string | null
  title: string
  description?: string | null
  kind: EventKind
  startsAt: string
  endsAt?: string | null
  allDay: boolean
  location?: string | null
  link?: string | null
  visibility: EventVisibility
}

/**
 * Patch parcial do PATCH. O escopo não muda depois de criado (o servidor responde 400).
 * Ao mandar startsAt ou endsAt, mande também allDay: o servidor precisa dele para ler o formato da data.
 */
export type EventPatch = Partial<Omit<EventInput, 'scope' | 'scopeValue'>>

export type ReviewBody = {
  decision: ReviewDecision
  note?: string | null
  changes?: EventPatch | null
}

/** Intervalo em ISO completo com offset, como o GET /api/events exige. */
export type EventRange = { from: string; to: string }

const enc = encodeURIComponent

export async function fetchEvents(range: EventRange, { otherClasses }: { otherClasses: boolean }, signal?: AbortSignal): Promise<EventDto[]> {
  const params = new URLSearchParams({ from: range.from, to: range.to })
  if (otherClasses) params.set('otherClasses', '1')
  const body = await request<{ events: EventDto[] }>(`/api/events?${params.toString()}`, { signal })
  return body.events
}

export async function fetchEvent(id: string, { otherClasses }: { otherClasses: boolean }, signal?: AbortSignal): Promise<EventDto> {
  const body = await request<{ event: EventDto }>(`/api/events/${enc(id)}${otherClasses ? '?otherClasses=1' : ''}`, { signal })
  return body.event
}

export async function fetchEventScopes(signal?: AbortSignal): Promise<EventScopeOption[]> {
  const body = await request<{ scopes: EventScopeOption[] }>('/api/events/scopes', { signal })
  return body.scopes
}

export async function fetchMyEvents(signal?: AbortSignal): Promise<EventDto[]> {
  const body = await request<{ events: EventDto[] }>('/api/events/mine', { signal })
  return body.events
}

export async function fetchReviewQueue(signal?: AbortSignal): Promise<ReviewEventDto[]> {
  const body = await request<{ events: ReviewEventDto[] }>('/api/events/review', { signal })
  return body.events
}

/** `moderates`: o usuário modera algo (superadmin ou admin de entidade), mesmo com a fila vazia. */
export async function fetchReviewCount(signal?: AbortSignal): Promise<{ count: number; moderates: boolean }> {
  const body = await request<{ count: number; moderates: boolean }>('/api/events/review/count', { signal })
  return { count: body.count, moderates: body.moderates }
}

export async function createEvent(input: EventInput): Promise<EventDto> {
  const body = await request<{ event: EventDto }>('/api/events', { method: 'POST', json: input })
  return body.event
}

export async function updateEvent(id: string, patch: EventPatch): Promise<EventDto> {
  const body = await request<{ event: EventDto }>(`/api/events/${enc(id)}`, { method: 'PATCH', json: patch })
  return body.event
}

/** Cancela um evento (204, sem corpo). */
export const cancelEvent = (id: string) => request<void>(`/api/events/${enc(id)}/cancel`, { method: 'POST' })

export async function reviewEvent(id: string, body: ReviewBody): Promise<EventDto> {
  const res = await request<{ event: EventDto }>(`/api/events/${enc(id)}/review`, { method: 'POST', json: body })
  return res.event
}

export const reportEvent = (id: string, reason?: string) =>
  request<{ reported: boolean; hidden: boolean }>(`/api/events/${enc(id)}/report`, { method: 'POST', json: reason ? { reason } : {} })

export async function setEventRsvp(id: string, status: RsvpStatus | null): Promise<EventRsvp> {
  const body = await request<{ rsvp: EventRsvp }>(`/api/events/${enc(id)}/rsvp`, { method: 'PUT', json: { status } })
  return body.rsvp
}

/** Feed .ics pessoal para assinar no Google Calendar. A URL só vem na criação: o servidor guarda apenas o hash. */
export async function fetchFeedStatus(signal?: AbortSignal): Promise<{ enabled: boolean }> {
  return request<{ enabled: boolean }>('/api/calendar-feed/status', { signal })
}

export async function createFeedToken(): Promise<{ url: string }> {
  return request<{ url: string }>('/api/calendar-feed/token', { method: 'POST' })
}

export const disableFeed = () => request<void>('/api/calendar-feed/token', { method: 'DELETE' })
