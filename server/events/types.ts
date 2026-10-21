export type EventKind = 'event' | 'meeting' | 'exam' | 'assignment' | 'deadline' | 'holiday'
export type EventScope = 'usp' | 'campus' | 'course' | 'cohort' | 'class' | 'entity'
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hidden'
export type EventVisibility = 'public' | 'members'
export type ScopeRef = { scope: EventScope; scopeValue: string | null }

// Tudo que as regras precisam saber sobre quem está agindo. A camada de dados (A3) monta isso.
export type EventActor = {
  userId: string
  isSuperadmin: boolean
  campus: string | null
  course: string | null        // nome do curso no perfil (ex.: 'Sistemas de Informação'); é o scopeValue de 'course'
  entryYear: number | null     // scopeValue de 'cohort' é String(entryYear)
  classCodes: ReadonlySet<string>               // códigos de user_courses
  memberships: ReadonlyMap<string, 'member' | 'admin'> // só entidades ativas (left_at null)
}

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

export type EventRecord = ScopeRef & EventFields & {
  id: string
  status: EventStatus
  createdBy: string | null
  pendingChanges: Partial<Pick<EventFields, 'title' | 'kind' | 'startsAt' | 'endsAt' | 'allDay'>> | null
  source: 'user' | 'usp_import'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

export const REPORT_THRESHOLD = 3
export const DAILY_SUBMISSION_LIMIT = 10
export const MAX_RANGE_DAYS = 100
