import { COURSE_CODE_PATTERN, ENTITY_ID_PATTERN, type Validated } from '../social/validation.js'
import { MAX_RANGE_DAYS, type EventFields, type EventKind, type EventScope, type EventVisibility, type ScopeRef } from './types.js'
import type { ReviewDecision } from './rules.js'

const KINDS: readonly EventKind[] = ['event', 'meeting', 'exam', 'assignment', 'deadline', 'holiday']
const SCOPES: readonly EventScope[] = ['usp', 'campus', 'course', 'cohort', 'class', 'entity']
const VISIBILITIES: readonly EventVisibility[] = ['public', 'members']
const DECISIONS: readonly ReviewDecision[] = ['approve', 'reject', 'restore', 'remove']
const FIELD_KEYS = ['title', 'description', 'kind', 'startsAt', 'endsAt', 'allDay', 'location', 'link', 'visibility']
const DAY_MS = 86_400_000
const MAX_DURATION_MS = 31 * DAY_MS
// Brasil sem horário de verão desde 2019: America/Sao_Paulo é UTC-03:00 fixo.
const SP_OFFSET = '-03:00'
const SP_OFFSET_MS = 3 * 3_600_000

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001F\u007F]/

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

// YYYY-MM-DD no fuso de São Paulo (para agrupar por dia no app, no .ics e na importação).
export function toSaoPauloDate(iso: string): string {
  return new Date(Date.parse(iso) - SP_OFFSET_MS).toISOString().slice(0, 10)
}

function parseDay(raw: string): string | null {
  const match = DATE_RE.exec(raw)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  return new Date(Date.parse(`${raw}T00:00:00${SP_OFFSET}`)).toISOString()
}

function parseInstant(raw: string): string | null {
  if (!DATETIME_RE.test(raw)) return null
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return null
  // recusa dias inexistentes (30/02), que alguns motores "corrigem" em silêncio
  const day = raw.slice(0, 10)
  const local = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))))
  if (local.toISOString().slice(0, 10) !== day) return null
  return new Date(ms).toISOString()
}

function parseTime(value: unknown, allDay: boolean): string | null {
  if (typeof value !== 'string') return null
  return allDay ? parseDay(value.trim()) : parseInstant(value.trim())
}

function optionalText(value: unknown, max: number, label: string): Validated<string | null> {
  if (value === null || value === undefined) return { ok: true, value: null }
  if (typeof value !== 'string') return fail(`${label} inválido`)
  const text = value.trim()
  if (text.length > max) return fail(`${label} deve ter no máximo ${max} caracteres`)
  return { ok: true, value: text || null }
}

function validateLink(value: unknown): Validated<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null }
  if (typeof value !== 'string') return fail('Link inválido')
  const raw = value.trim()
  if (!raw) return { ok: true, value: null }
  if (raw.length > 300 || /\s/.test(raw)) return fail('Link inválido')
  let url: URL
  try { url = new URL(raw) } catch { return fail('Link inválido') }
  if (url.protocol !== 'https:' || url.username || url.password) return fail('Use um link https sem usuário e senha')
  return { ok: true, value: url.href }
}

function validateScope(input: Record<string, unknown>, now: Date): Validated<ScopeRef> {
  const scope = input.scope
  if (typeof scope !== 'string' || !(SCOPES as readonly string[]).includes(scope)) return fail('Escopo inválido')
  const raw = input.scopeValue
  if (scope === 'usp') {
    if (raw !== undefined && raw !== null) return fail('Eventos da USP não têm valor de escopo')
    return { ok: true, value: { scope, scopeValue: null } }
  }
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (scope === 'class') {
    const code = value.toUpperCase()
    if (!COURSE_CODE_PATTERN.test(code)) return fail('Matéria inválida')
    return { ok: true, value: { scope, scopeValue: code } }
  }
  if (scope === 'entity') {
    if (!ENTITY_ID_PATTERN.test(value)) return fail('Entidade inválida')
    return { ok: true, value: { scope, scopeValue: value } }
  }
  if (scope === 'cohort') {
    const year = Number(value)
    if (!/^\d{4}$/.test(value) || year < 2000 || year > now.getFullYear() + 1) return fail('Turma inválida')
    return { ok: true, value: { scope, scopeValue: value } }
  }
  if (!value || value.length > 80 || CONTROL_RE.test(value)) return fail(scope === 'campus' ? 'Campus inválido' : 'Curso inválido')
  return { ok: true, value: { scope: scope as EventScope, scopeValue: value } }
}

function checkWindow(startsAt: string | undefined, endsAt: string | null | undefined, now: Date): string | null {
  if (startsAt !== undefined) {
    const start = Date.parse(startsAt)
    const limit = new Date(now)
    limit.setUTCFullYear(limit.getUTCFullYear() + 2)
    if (start < now.getTime() - DAY_MS) return 'A data de início já passou'
    if (start > limit.getTime()) return 'A data de início está longe demais (máximo de 2 anos)'
  }
  if (startsAt !== undefined && endsAt) {
    const start = Date.parse(startsAt)
    const end = Date.parse(endsAt)
    if (end < start) return 'O fim não pode ser antes do início'
    if (end - start > MAX_DURATION_MS) return 'O evento pode durar no máximo 31 dias'
  }
  return null
}

// `partial`: só valida o que veio. Quando mexe em datas, `allDay` precisa vir junto para sabermos o formato.
function validateFields(input: Record<string, unknown>, now: Date, partial: boolean): Validated<Partial<EventFields>> {
  const out: Partial<EventFields> = {}
  const has = (key: string) => key in input

  if (!partial || has('title')) {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (title.length < 1 || title.length > 80) return fail('O título deve ter de 1 a 80 caracteres')
    out.title = title
  }
  if (has('description')) {
    const description = optionalText(input.description, 1000, 'Descrição')
    if (!description.ok) return description
    out.description = description.value
  } else if (!partial) out.description = null
  if (!partial || has('kind')) {
    if (typeof input.kind !== 'string' || !(KINDS as readonly string[]).includes(input.kind)) return fail('Tipo inválido')
    out.kind = input.kind as EventKind
  }
  if (has('location')) {
    const location = optionalText(input.location, 120, 'Local')
    if (!location.ok) return location
    out.location = location.value
  } else if (!partial) out.location = null
  if (has('link')) {
    const link = validateLink(input.link)
    if (!link.ok) return link
    out.link = link.value
  } else if (!partial) out.link = null
  if (has('visibility')) {
    if (typeof input.visibility !== 'string' || !(VISIBILITIES as readonly string[]).includes(input.visibility)) return fail('Visibilidade inválida')
    out.visibility = input.visibility as EventVisibility
  } else if (!partial) out.visibility = 'public'

  if (has('allDay') && typeof input.allDay !== 'boolean') return fail('Dados inválidos')
  if (partial && (has('startsAt') || has('endsAt')) && !has('allDay')) return fail('Ao mudar a data, informe também se é dia inteiro')
  const allDay = has('allDay') ? input.allDay === true : false
  if (!partial || has('allDay')) out.allDay = allDay

  if (!partial || has('startsAt')) {
    const startsAt = parseTime(input.startsAt, allDay)
    if (!startsAt) return fail(allDay ? 'Data de início inválida (use AAAA-MM-DD)' : 'Data de início inválida')
    out.startsAt = startsAt
  }
  if (has('endsAt')) {
    if (input.endsAt === null || input.endsAt === '') out.endsAt = null
    else {
      const endsAt = parseTime(input.endsAt, allDay)
      if (!endsAt) return fail(allDay ? 'Data de fim inválida (use AAAA-MM-DD)' : 'Data de fim inválida')
      out.endsAt = endsAt
    }
  } else if (!partial) out.endsAt = null

  const windowError = checkWindow(out.startsAt, out.endsAt, now)
  if (windowError) return fail(windowError)
  return { ok: true, value: out }
}

export function validateEventInput(body: unknown, now: Date = new Date()): Validated<ScopeRef & EventFields> {
  if (!isObject(body)) return fail('Dados inválidos')
  if (Object.keys(body).some((key) => key !== 'scope' && key !== 'scopeValue' && !FIELD_KEYS.includes(key))) return fail('Campo desconhecido')
  const scope = validateScope(body, now)
  if (!scope.ok) return scope
  const fields = validateFields(body, now, false)
  if (!fields.ok) return fields
  const value = { ...scope.value, ...(fields.value as EventFields) }
  if (value.visibility === 'members' && value.scope !== 'entity') return fail('Só eventos de entidade podem ser restritos a membros')
  return { ok: true, value }
}

// `visibility: 'members'` depende do escopo do evento existente; quem chama (A4) confere contra o evento.
// O fim >= início também precisa ser reconferido contra o valor já salvo quando só um dos dois vem no patch.
export function validateEventPatch(body: unknown, now: Date = new Date()): Validated<Partial<EventFields>> {
  if (!isObject(body)) return fail('Dados inválidos')
  if ('scope' in body || 'scopeValue' in body) return fail('Não dá para mudar o escopo; cancele e proponha outro')
  const keys = Object.keys(body)
  if (keys.length === 0) return fail('Nada para atualizar')
  if (keys.some((key) => !FIELD_KEYS.includes(key))) return fail('Campo desconhecido')
  return validateFields(body, now, true)
}

export function validateRange(from: unknown, to: unknown): Validated<{ from: string; to: string }> {
  if (typeof from !== 'string' || typeof to !== 'string') return fail('Intervalo inválido')
  const start = parseInstant(from)
  const end = parseInstant(to)
  if (!start || !end) return fail('Intervalo inválido')
  const span = Date.parse(end) - Date.parse(start)
  if (span <= 0) return fail('O início do intervalo deve ser antes do fim')
  if (span > MAX_RANGE_DAYS * DAY_MS) return fail(`O intervalo pode ter no máximo ${MAX_RANGE_DAYS} dias`)
  return { ok: true, value: { from: start, to: end } }
}

export type ReviewInput = { decision: ReviewDecision; note: string | null; changes: Partial<EventFields> | null }

export function validateReview(body: unknown, now: Date = new Date()): Validated<ReviewInput> {
  if (!isObject(body)) return fail('Dados inválidos')
  if (Object.keys(body).some((key) => key !== 'decision' && key !== 'note' && key !== 'changes')) return fail('Campo desconhecido')
  const decision = body.decision
  if (typeof decision !== 'string' || !(DECISIONS as readonly string[]).includes(decision)) return fail('Decisão inválida')
  const note = optionalText(body.note, 280, 'Nota')
  if (!note.ok) return note
  let changes: Partial<EventFields> | null = null
  if (body.changes !== undefined && body.changes !== null) {
    if (decision !== 'approve') return fail('Só dá para ajustar ao aprovar')
    const patch = validateEventPatch(body.changes, now)
    if (!patch.ok) return patch
    changes = patch.value
  }
  return { ok: true, value: { decision: decision as ReviewDecision, note: note.value, changes } }
}

export function validateReport(body: unknown): Validated<{ reason: string | null }> {
  if (body === undefined || body === null) return { ok: true, value: { reason: null } }
  if (!isObject(body)) return fail('Dados inválidos')
  if (Object.keys(body).some((key) => key !== 'reason')) return fail('Campo desconhecido')
  const reason = optionalText(body.reason, 200, 'Motivo')
  if (!reason.ok) return reason
  return { ok: true, value: { reason: reason.value } }
}
