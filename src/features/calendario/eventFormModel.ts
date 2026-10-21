// Estado, conversão e validação do formulário de evento. Espelha server/events/validation.ts.
import type { EventDto, EventInput, EventKind, EventPatch, EventScopeOption } from '../../lib/eventsApi'
import { saoPauloDateKey } from './dateRange'

export type FormValues = {
  kind: EventKind
  title: string
  allDay: boolean
  /** YYYY-MM-DD com dia inteiro; YYYY-MM-DDTHH:mm sem. */
  startsAt: string
  endsAt: string
  location: string
  link: string
  description: string
  membersOnly: boolean
}

const SP_OFFSET = '-03:00'
const SP_OFFSET_MS = 3 * 3_600_000
const DAY_MS = 86_400_000
const MAX_DURATION_MS = 31 * DAY_MS
const TITLE_MAX = 80
const LOCATION_MAX = 120
const LINK_MAX = 300
const DESCRIPTION_MAX = 1000

export const scopeKey = (s: Pick<EventScopeOption, 'scope' | 'scopeValue'>) => `${s.scope}:${s.scopeValue ?? ''}`

function wallInput(iso: string): string {
  return new Date(Date.parse(iso) - SP_OFFSET_MS).toISOString().slice(0, 16)
}

export function valuesFromEvent(event: EventDto): FormValues {
  const day = (iso: string) => saoPauloDateKey(iso)
  return {
    kind: event.kind,
    title: event.title,
    allDay: event.allDay,
    startsAt: event.allDay ? day(event.startsAt) : wallInput(event.startsAt),
    endsAt: event.endsAt ? (event.allDay ? day(event.endsAt) : wallInput(event.endsAt)) : '',
    location: event.location ?? '',
    link: event.link ?? '',
    description: event.description ?? '',
    membersOnly: event.visibility === 'members',
  }
}

export function emptyValues(): FormValues {
  return { kind: 'event', title: '', allDay: false, startsAt: '', endsAt: '', location: '', link: '', description: '', membersOnly: false }
}

/** Troca dia inteiro <-> horário sem perder a data já escolhida. */
export function withAllDay(values: FormValues, allDay: boolean): FormValues {
  const convert = (value: string, time: string) => (!value ? '' : allDay ? value.slice(0, 10) : value.length === 10 ? `${value}T${time}` : value)
  return { ...values, allDay, startsAt: convert(values.startsAt, '09:00'), endsAt: convert(values.endsAt, '10:00') }
}

/** Valor do input -> o que o servidor espera: YYYY-MM-DD (dia inteiro) ou ISO com -03:00. */
export function toApiTime(value: string, allDay: boolean): string {
  return allDay ? value : `${value}:00${SP_OFFSET}`
}

function instant(value: string, allDay: boolean): number {
  return Date.parse(allDay ? `${value}T00:00:00${SP_OFFSET}` : toApiTime(value, false))
}

const textOrNull = (value: string) => value.trim() || null

export function validateValues(values: FormValues, opts: { now?: Date; checkStart?: boolean } = {}): string | null {
  const now = opts.now ?? new Date()
  const title = values.title.trim()
  if (title.length < 1 || title.length > TITLE_MAX) return `O título deve ter de 1 a ${TITLE_MAX} caracteres`
  if (!values.startsAt) return 'Informe o início'
  const start = instant(values.startsAt, values.allDay)
  if (Number.isNaN(start)) return 'Data de início inválida'
  if (opts.checkStart !== false) {
    const limit = new Date(now)
    limit.setUTCFullYear(limit.getUTCFullYear() + 2)
    if (start < now.getTime() - DAY_MS) return 'A data de início já passou'
    if (start > limit.getTime()) return 'A data de início está longe demais (máximo de 2 anos)'
  }
  if (values.endsAt) {
    const end = instant(values.endsAt, values.allDay)
    if (Number.isNaN(end)) return 'Data de fim inválida'
    if (end < start) return 'O fim não pode ser antes do início'
    if (end - start > MAX_DURATION_MS) return 'O evento pode durar no máximo 31 dias'
  }
  if (values.location.trim().length > LOCATION_MAX) return `O local deve ter no máximo ${LOCATION_MAX} caracteres`
  if (values.description.trim().length > DESCRIPTION_MAX) return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres`
  const link = values.link.trim()
  if (link) {
    if (link.length > LINK_MAX || /\s/.test(link)) return 'Link inválido'
    let url: URL
    try { url = new URL(link) } catch { return 'Link inválido' }
    if (url.protocol !== 'https:' || url.username || url.password) return 'Use um link https sem usuário e senha'
  }
  return null
}

export function buildCreateInput(scope: EventScopeOption, v: FormValues): EventInput {
  return {
    scope: scope.scope,
    scopeValue: scope.scopeValue,
    title: v.title.trim(),
    description: textOrNull(v.description),
    kind: v.kind,
    startsAt: toApiTime(v.startsAt, v.allDay),
    endsAt: v.endsAt ? toApiTime(v.endsAt, v.allDay) : null,
    allDay: v.allDay,
    location: textOrNull(v.location),
    link: textOrNull(v.link),
    visibility: scope.scope === 'entity' && v.membersOnly ? 'members' : 'public',
  }
}

/** Só os campos alterados. Mexeu em data (início, fim ou dia inteiro): manda início, fim e allDay juntos. */
export function buildPatch(initial: FormValues, v: FormValues, scope: EventDto['scope']): EventPatch {
  const patch: EventPatch = {}
  if (v.title.trim() !== initial.title.trim()) patch.title = v.title.trim()
  if (v.kind !== initial.kind) patch.kind = v.kind
  if (v.description.trim() !== initial.description.trim()) patch.description = textOrNull(v.description)
  if (v.location.trim() !== initial.location.trim()) patch.location = textOrNull(v.location)
  if (v.link.trim() !== initial.link.trim()) patch.link = textOrNull(v.link)
  if (scope === 'entity' && v.membersOnly !== initial.membersOnly) patch.visibility = v.membersOnly ? 'members' : 'public'
  if (v.startsAt !== initial.startsAt || v.endsAt !== initial.endsAt || v.allDay !== initial.allDay) {
    patch.startsAt = toApiTime(v.startsAt, v.allDay)
    patch.endsAt = v.endsAt ? toApiTime(v.endsAt, v.allDay) : null
    patch.allDay = v.allDay
  }
  return patch
}
