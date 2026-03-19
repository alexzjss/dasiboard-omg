// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  photoUrl: string | null
  bio: string | null
  turma: string | null
  role: UserRole
  createdAt: string
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventType = 'prova' | 'entrega' | 'evento' | 'deadline' | 'apresentacao'
export type EventStatus = 'published' | 'pending' | 'rejected'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string          // ISO date "YYYY-MM-DD"
  type: EventType
  turmas: string[]
  status: EventStatus
  entidade?: {
    id: string; name: string; slug: string
    emoji: string; colorPrimary: string
  }
  createdBy?: { id: string; displayName: string | null }
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

export type KanbanColumn = 'todo' | 'doing' | 'done'
export type KanbanTag    = 'prova' | 'entrega' | 'leitura' | 'projeto' | 'pessoal'

export interface KanbanCardType {
  id: string
  title: string
  description?: string
  column: KanbanColumn
  tag?: KanbanTag
  dueDate?: string     // ISO date "YYYY-MM-DD"
  position: number
  createdAt: string
  updatedAt: string
}

export interface KanbanBoard {
  todo: KanbanCardType[]
  doing: KanbanCardType[]
  done: KanbanCardType[]
}

// ─── GPA ──────────────────────────────────────────────────────────────────────

export interface UserGradeType {
  id: string
  disciplineId: string
  grade: number | null
  credits: number
  semester: number
  updatedAt: string
}

// ─── Faltas ───────────────────────────────────────────────────────────────────

export interface UserAbsenceType {
  id: string
  disciplineCode: string
  disciplineName: string
  totalClasses: number
  absences: number
  updatedAt: string
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterIssueType {
  id: string
  title: string
  summary: string
  content: string
  publishedAt: string
  entidade?: {
    id: string; name: string; slug: string; emoji: string
  }
}

// ─── Entidade ─────────────────────────────────────────────────────────────────

export interface EntidadeLink {
  label: string
  url: string
  icon?: string
}

export interface EntidadeType {
  id: string
  slug: string
  name: string
  fullName?: string
  type: string
  description?: string
  colorPrimary?: string
  colorSecondary?: string
  emoji?: string
  email?: string
  links: EntidadeLink[]
  active: boolean
  events?: CalendarEvent[]
  newsletterIssues?: NewsletterIssueType[]
}

// ─── Study Material ───────────────────────────────────────────────────────────

export type MaterialType = 'livro' | 'artigo' | 'video' | 'curso' | 'link' | 'pdf'

export interface StudyMaterialType {
  id: string
  title: string
  type: MaterialType
  area?: string
  discipline?: string
  author?: string
  url?: string
  fileUrl?: string
  tags: string[]
}

// ─── Docente ──────────────────────────────────────────────────────────────────

export interface DocenteType {
  id: string
  name: string
  title?: string
  area?: string
  email?: string
  photoUrl?: string
  lattes?: string
  site?: string
  active: boolean
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string
  issues?: { field: string; message: string }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
