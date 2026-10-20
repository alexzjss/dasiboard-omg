// Cliente tipado da API social (server/routes/social.ts, entities.ts, admin.ts).
// Os tipos espelham os presenters do servidor: só os campos que o servidor de fato devolve.
import { apiFetch } from './api'
import type { CardFinish, CardPaletteId, CardSettings } from './cardOptions'
export type { CardSettings } from './cardOptions'

export type Visibility = 'all' | 'connections' | 'none'
export type EntityRole = 'member' | 'admin'
export type ConnectionState = 'self' | 'none' | 'pending_sent' | 'pending_received' | 'accepted'
export type ConnectionStatus = 'pending' | 'accepted'

export type Links = { github?: string; linkedin?: string; instagram?: string }

/** Cartão mínimo de um aluno: o que sempre é visível para quem está logado. */
export type PersonMini = { handle: string; name: string; picture: string | null }

export type BadgeKind = 'entity_member' | 'achievement' | 'admin_award' | 'entity_award' | 'cohort'

export type Badge = { kind: BadgeKind; sourceId: string; label: string; icon: string | null; color: string | null; entityId: string | null }

export type EntityMembership = { entityId: string; name: string; role: EntityRole; joinedAt: string; title: string | null }

export type CourseItem = { code: string; title: string }

/** Perfil próprio (GET/PATCH /api/me/profile). */
export type MyProfile = {
  profile: {
    handle: string
    name: string
    email: string
    picture: string | null
    /** true quando a foto vem do upload próprio (não do Google). */
    hasCustomAvatar: boolean
    bio: string | null
    course: string
    entryYear: number | null
    links: Links
    technologies: string[]
    showCourses: Visibility
    showConnections: Visibility
  }
  entities: EntityMembership[]
  badges: Badge[]
  adminOf: string[]
  isSuperadmin: boolean
  courses: CourseItem[]
  pendingCount: number
  pendingRequests: (PersonMini & { course: string; createdAt: string })[]
}

/** Campos editáveis do perfil (corpo do PATCH). Chaves em camelCase, como o validador espera. */
export type ProfilePatch = Partial<Pick<MyProfile['profile'], 'bio' | 'course' | 'entryYear' | 'links' | 'technologies' | 'showCourses' | 'showConnections'>>

/** Item da lista de alunos (GET /api/people). */
export type PersonCard = PersonMini & {
  course: string
  entryYear: number | null
  badges: Badge[]
  connection: ConnectionState
  /** null quando a privacidade do aluno oculta as matérias para quem pede. */
  commonCourses: number | null
}

export type PeopleFilters = {
  q?: string
  curso?: string
  ano?: number
  entidade?: string
  materia?: string
}

export type PeoplePage = { people: PersonCard[]; nextCursor: string | null }

/** Perfil de outro aluno (GET /api/people/:handle). */
export type PersonProfile = {
  profile: PersonMini & {
    course: string
    entryYear: number | null
    bio: string | null
    links: Links
    technologies: string[]
    self: boolean
  }
  connection: ConnectionState
  badges: Badge[]
  /** Entidades ativas com o cargo de cada uma (null quando não há). */
  entities: { entityId: string; name: string; title: string | null }[]
  courses: (CourseItem & { common: boolean })[] | null
  commonCourses: number | null
  classmatesInCommon: PersonMini[] | null
  connections: { count: number; people: PersonMini[] } | null
  visibility: { courses: boolean; connections: boolean }
}

/** Conexão aceita (GET /api/connections?status=accepted). */
export type ConnectionPerson = PersonMini & { course: string }
/** Pedido recebido e ainda não aceito (GET /api/connections?status=pending). */
export type PendingRequest = PersonMini & { course: string; createdAt: string }

/** Itens do feed (GET /api/feed). Só eventos que a privacidade permite chegam aqui. */
export type FeedItem =
  | { id: string; type: 'entity_join'; at: string; person: PersonMini; entity: { id: string; name: string } }
  | { id: string; type: 'connection'; at: string; person: PersonMini; other: PersonMini }
  | { id: string; type: 'classmate_joined'; at: string; person: PersonMini }

export type FeedPage = { items: FeedItem[]; nextCursor: string | null }

export type EntityMember = PersonMini & { role: EntityRole; joinedAt: string; title: string | null }

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const DEFAULT_MESSAGE = 'Não foi possível concluir a operação'

type RequestInitJson = RequestInit & { json?: unknown }

async function request<T>(path: string, init: RequestInitJson = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const finalInit: RequestInit = {
    ...rest,
    headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
  }
  if (json !== undefined) finalInit.body = JSON.stringify(json)

  let response: Response
  try {
    response = await apiFetch(path, finalInit)
  } catch (error) {
    // Abort is the caller's decision and must reach it untouched; anything else is a network failure.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Sem conexão com o servidor')
  }

  if (!response.ok) {
    let message = DEFAULT_MESSAGE
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body?.error === 'string' && body.error) message = body.error
    } catch {
      // corpo que não é JSON: fica a mensagem padrão
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const enc = encodeURIComponent

// ---------- perfil próprio ----------

export const getMyProfile = (signal?: AbortSignal) => request<MyProfile>('/api/me/profile', { signal })

export const updateMyProfile = (patch: ProfilePatch) => request<MyProfile>('/api/me/profile', { method: 'PATCH', json: patch })

// ---------- pessoas ----------

export function listPeople(filters: PeopleFilters = {}, cursor?: string | null, signal?: AbortSignal): Promise<PeoplePage> {
  const params = new URLSearchParams()
  const q = filters.q?.trim()
  const curso = filters.curso?.trim()
  if (q) params.set('q', q)
  if (curso) params.set('curso', curso)
  if (filters.ano !== undefined) params.set('ano', String(filters.ano))
  if (filters.entidade) params.set('entidade', filters.entidade)
  if (filters.materia) params.set('materia', filters.materia)
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return request<PeoplePage>(`/api/people${qs ? `?${qs}` : ''}`, { signal })
}

export const getPerson = (handle: string, signal?: AbortSignal) => request<PersonProfile>(`/api/people/${enc(handle)}`, { signal })

// ---------- conexões ----------

export const requestConnection = (handle: string) =>
  request<{ status: 'pending' | 'accepted' }>(`/api/connections/${enc(handle)}`, { method: 'POST' })

export const acceptConnection = (handle: string) =>
  request<{ status: 'accepted' }>(`/api/connections/${enc(handle)}/accept`, { method: 'POST' })

/** Recusa, cancela ou desfaz uma conexão (o servidor trata tudo como DELETE idempotente). */
export const removeConnection = (handle: string) => request<void>(`/api/connections/${enc(handle)}`, { method: 'DELETE' })

export function listConnections(status: 'pending'): Promise<PendingRequest[]>
export function listConnections(status: 'accepted'): Promise<ConnectionPerson[]>
export async function listConnections(status: ConnectionStatus): Promise<PendingRequest[] | ConnectionPerson[]> {
  const body = await request<{ connections: PendingRequest[] | ConnectionPerson[] }>(`/api/connections?status=${enc(status)}`)
  return body.connections
}

export type NotificationCount = { unread: number; pendingRequests: number }

export const getNotificationCount = (signal?: AbortSignal) => request<NotificationCount>('/api/notifications/count', { signal })

export type NotificationType =
  | 'connection_request' | 'connection_accepted' | 'entity_joined' | 'entity_role_changed' | 'entity_removed' | 'badge_awarded' | 'announcement'

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  body: string
  url: string
  createdAt: string
  read: boolean
  actor: PersonMini | null
}

export type NotificationPage = { items: NotificationItem[]; nextCursor: string | null }

export const listNotifications = (cursor?: string | null, signal?: AbortSignal) =>
  request<NotificationPage>(`/api/notifications${cursor ? `?cursor=${enc(cursor)}` : ''}`, { signal })

export const markNotificationRead = (id: string) => request<void>(`/api/notifications/${enc(id)}/read`, { method: 'POST' })

export const markAllNotificationsRead = () => request<void>('/api/notifications/read-all', { method: 'POST' })

// ---------- feed ----------

export const getFeed = (cursor?: string | null, signal?: AbortSignal) =>
  request<FeedPage>(`/api/feed${cursor ? `?cursor=${enc(cursor)}` : ''}`, { signal })

// ---------- entidades ----------

export const joinEntity = (code: string) =>
  request<{ entity: { id: string; name: string } }>('/api/entities/join', { method: 'POST', json: { code } })

export const leaveEntity = (id: string) => request<void>(`/api/entities/${enc(id)}/membership`, { method: 'DELETE' })

export async function listEntityMembers(id: string, signal?: AbortSignal): Promise<EntityMember[]> {
  const body = await request<{ members: EntityMember[] }>(`/api/entities/${enc(id)}/members`, { signal })
  return body.members
}

/** Define (ou limpa, com null) o cargo de um membro. Só admin da entidade. */
export const setMemberTitle = (id: string, handle: string, title: string | null) =>
  request<{ handle: string; title: string | null }>(`/api/entities/${enc(id)}/members/${enc(handle)}/title`, { method: 'PUT', json: { title } })

/** Gera um novo código de convite. O código em texto só volta nesta resposta. */
export const rotateInviteCode = (id: string) => request<{ code: string }>(`/api/entities/${enc(id)}/invite-code`, { method: 'POST' })

export const removeEntityMember = (id: string, handle: string) =>
  request<void>(`/api/entities/${enc(id)}/members/${enc(handle)}`, { method: 'DELETE' })

/** Superadmin promove ou rebaixa um admin da entidade (rota em /api/admin). */
export const setEntityAdmin = (id: string, handle: string, admin: boolean) =>
  request<{ entityId: string; handle: string; role: EntityRole }>(`/api/admin/entities/${enc(id)}/admins/${enc(handle)}`, {
    method: 'PUT',
    json: { admin },
  })

// ---------- badges concedidas (administração e entidades) ----------

export type BadgeDefinition = {
  id: string
  kind: 'admin_award' | 'entity_award'
  entityId: string | null
  label: string
  description: string | null
  icon: string
  color: string
}
export type NewBadgeDefinition = { label: string; description?: string; icon: string; color: string }

export async function listAdminBadges(signal?: AbortSignal): Promise<BadgeDefinition[]> {
  return (await request<{ definitions: BadgeDefinition[] }>('/api/admin/badges', { signal })).definitions
}
export async function createAdminBadge(input: NewBadgeDefinition): Promise<BadgeDefinition> {
  return (await request<{ definition: BadgeDefinition }>('/api/admin/badges', { method: 'POST', json: input })).definition
}
export const archiveAdminBadge = (defId: string) => request<void>(`/api/admin/badges/${enc(defId)}`, { method: 'DELETE' })
export const grantAdminBadge = (defId: string, handle: string) =>
  request<void>(`/api/admin/badges/${enc(defId)}/holders/${enc(handle)}`, { method: 'PUT' })
export const revokeAdminBadge = (defId: string, handle: string) =>
  request<void>(`/api/admin/badges/${enc(defId)}/holders/${enc(handle)}`, { method: 'DELETE' })

export async function listEntityBadges(id: string, signal?: AbortSignal): Promise<BadgeDefinition[]> {
  return (await request<{ definitions: BadgeDefinition[] }>(`/api/entities/${enc(id)}/badges`, { signal })).definitions
}
export async function createEntityBadge(id: string, input: NewBadgeDefinition): Promise<BadgeDefinition> {
  return (await request<{ definition: BadgeDefinition }>(`/api/entities/${enc(id)}/badges`, { method: 'POST', json: input })).definition
}
export const archiveEntityBadge = (id: string, defId: string) => request<void>(`/api/entities/${enc(id)}/badges/${enc(defId)}`, { method: 'DELETE' })
export const grantEntityBadge = (id: string, defId: string, handle: string) =>
  request<void>(`/api/entities/${enc(id)}/badges/${enc(defId)}/holders/${enc(handle)}`, { method: 'PUT' })
export const revokeEntityBadge = (id: string, defId: string, handle: string) =>
  request<void>(`/api/entities/${enc(id)}/badges/${enc(defId)}/holders/${enc(handle)}`, { method: 'DELETE' })

// ---------- foto de perfil ----------

export type AvatarContentType = 'image/webp' | 'image/png' | 'image/jpeg'

export const requestAvatarUpload = (contentType: AvatarContentType) =>
  request<{ uploadUrl: string; path: string }>('/api/me/avatar/upload-url', { method: 'POST', json: { contentType } })

export const confirmAvatar = (path: string) => request<{ picture: string }>('/api/me/avatar', { method: 'PUT', json: { path } })

export const removeAvatar = () => request<{ picture: string | null }>('/api/me/avatar', { method: 'DELETE' })

// ---------- avisos ----------

export type AnnouncementAudience = 'all' | 'course' | 'cohort' | 'entity'
export type NewAnnouncement = { title: string; body: string; link?: string }
export type AdminAnnouncement = NewAnnouncement & { audience: AnnouncementAudience; audienceValue?: string }

export const sendAdminAnnouncement = (input: AdminAnnouncement) =>
  request<{ id: string; recipients: number }>('/api/admin/announcements', { method: 'POST', json: input })

export const sendEntityAnnouncement = (entityId: string, input: NewAnnouncement) =>
  request<{ id: string; recipients: number }>(`/api/entities/${enc(entityId)}/announcements`, { method: 'POST', json: input })

// ---------- carta de perfil ----------

/** Carta como o servidor entrega (whitelist: sem e-mail, matérias, horários, conexões ou ids internos). */
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
  badges: Badge[]
  settings: CardSettings
  viewer: { collected: boolean; connection: ConnectionState } | null
}

export type CardUnlocks = { finishes: CardFinish[]; palettes: CardPaletteId[]; requirements: Record<string, string> }
export type MyCard = { settings: CardSettings; public: boolean; unlocks: CardUnlocks; card: CardData }
export type CardPatch = { settings?: CardSettings; public?: boolean }

export const getMyCard = (signal?: AbortSignal) => request<MyCard>('/api/me/card', { signal })

export const updateMyCard = (patch: CardPatch) => request<MyCard>('/api/me/card', { method: 'PATCH', json: patch })

export const getCard = (handle: string, signal?: AbortSignal) => request<CardData>(`/api/cards/${enc(handle)}`, { signal })
