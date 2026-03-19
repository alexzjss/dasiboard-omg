import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string; title: string; description?: string
  date: string; type: string; turmas: string[]
  status: string; entidade?: { id: string; name: string; slug: string; emoji: string; colorPrimary: string }
}

export interface KanbanCard {
  id: string; title: string; description?: string
  column: 'todo' | 'doing' | 'done'; tag?: string
  dueDate?: string; position: number
  createdAt: string; updatedAt: string
}

export interface KanbanBoard { todo: KanbanCard[]; doing: KanbanCard[]; done: KanbanCard[] }

export interface NewsletterIssue {
  id: string; title: string; summary: string; content: string
  publishedAt: string; entidade?: { id: string; name: string; slug: string; emoji: string }
}

export interface Docente {
  id: string; name: string; title?: string; area?: string
  email?: string; photoUrl?: string; lattes?: string; site?: string
}

export interface Entidade {
  id: string; slug: string; name: string; fullName?: string
  type: string; description?: string; colorPrimary?: string
  colorSecondary?: string; emoji?: string; email?: string; links: { label: string; url: string; icon?: string }[]
  events?: Event[]; newsletterIssues?: NewsletterIssue[]
}

export interface StudyMaterial {
  id: string; title: string; type: string; area?: string
  discipline?: string; author?: string; url?: string; fileUrl?: string; tags: string[]
}

export interface UserGrade {
  id: string; disciplineId: string; grade: number | null; credits: number; semester: number
}

export interface UserAbsence {
  id: string; disciplineCode: string; disciplineName: string
  totalClasses: number; absences: number
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function useEvents(params?: { turma?: string; type?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => api.get<{ events: Event[] }>('/events', { params }).then((r) => r.data.events),
  })
}

export function usePendingEvents() {
  return useQuery({
    queryKey: ['events', 'pending'],
    queryFn: () => api.get<{ events: Event[] }>('/events/pending').then((r) => r.data.events),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Event>) => api.post('/events', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useApproveEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put(`/events/pending/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

export function useKanbanBoard() {
  return useQuery({
    queryKey: ['kanban'],
    queryFn: () => api.get<{ board: KanbanBoard }>('/kanban').then((r) => r.data.board),
  })
}

export function useCreateKanbanCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<KanbanCard>) => api.post('/kanban', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useUpdateKanbanCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<KanbanCard> & { id: string }) =>
      api.put(`/kanban/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useDeleteKanbanCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/kanban/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useReorderKanban() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (columns: { todo: string[]; doing: string[]; done: string[] }) =>
      api.put('/kanban/reorder', columns),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useClearDoneKanban() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/kanban/done'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export function useNewsletter(params?: { entidadeId?: string }) {
  return useQuery({
    queryKey: ['newsletter', params],
    queryFn: () => api.get<{ issues: NewsletterIssue[] }>('/newsletter', { params }).then((r) => r.data.issues),
  })
}

export function useNewsletterIssue(id: string) {
  return useQuery({
    queryKey: ['newsletter', id],
    queryFn: () => api.get<{ issue: NewsletterIssue }>(`/newsletter/${id}`).then((r) => r.data.issue),
    enabled: !!id,
  })
}

// ─── Docentes ─────────────────────────────────────────────────────────────────

export function useDocentes(q?: string) {
  return useQuery({
    queryKey: ['docentes', q],
    queryFn: () => api.get<{ docentes: Docente[] }>('/docentes', { params: { q } }).then((r) => r.data.docentes),
  })
}

// ─── Entidades ────────────────────────────────────────────────────────────────

export function useEntidades() {
  return useQuery({
    queryKey: ['entidades'],
    queryFn: () => api.get<{ entidades: Entidade[] }>('/entidades').then((r) => r.data.entidades),
  })
}

export function useEntidade(slug: string) {
  return useQuery({
    queryKey: ['entidades', slug],
    queryFn: () => api.get<{ entidade: Entidade }>(`/entidades/${slug}`).then((r) => r.data.entidade),
    enabled: !!slug,
  })
}

// ─── Estudos ──────────────────────────────────────────────────────────────────

export function useEstudos(params?: { q?: string; type?: string; area?: string }) {
  return useQuery({
    queryKey: ['estudos', params],
    queryFn: () =>
      api.get<{ materials: StudyMaterial[] }>('/estudos', { params }).then((r) => r.data.materials),
  })
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get<{ schedule: Record<string, unknown[]> }>('/schedule').then((r) => r.data.schedule),
  })
}

export function useTurmaSchedule(turmaCode: string) {
  return useQuery({
    queryKey: ['schedule', turmaCode],
    queryFn: () => api.get<{ slots: unknown[] }>(`/schedule/${turmaCode}`).then((r) => r.data.slots),
    enabled: !!turmaCode,
  })
}

// ─── GPA ──────────────────────────────────────────────────────────────────────

export function useGPA() {
  return useQuery({
    queryKey: ['gpa'],
    queryFn: () => api.get<{ grades: UserGrade[]; gpa: number | null }>('/gpa').then((r) => r.data),
  })
}

export function useUpsertGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ disciplineId, ...data }: { disciplineId: string; grade: number | null; credits: number; semester: number }) =>
      api.put(`/gpa/${disciplineId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpa'] }),
  })
}

// ─── Faltas ───────────────────────────────────────────────────────────────────

export function useFaltas() {
  return useQuery({
    queryKey: ['faltas'],
    queryFn: () => api.get<{ absences: UserAbsence[] }>('/faltas').then((r) => r.data.absences),
  })
}

export function useUpsertFalta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, ...data }: { code: string; disciplineName: string; totalClasses: number; absences: number }) =>
      api.put(`/faltas/${code}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faltas'] }),
  })
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export function useToolData(key: 'notes' | 'flashcards' | 'checklist') {
  return useQuery({
    queryKey: ['tools', key],
    queryFn: () => api.get<{ data: unknown }>(`/tools/${key}`).then((r) => r.data.data),
  })
}

export function useSaveToolData(key: 'notes' | 'flashcards' | 'checklist') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.put(`/tools/${key}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tools', key] }),
  })
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export function useChallenges() {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: () => api.get<{ challenges: unknown[] }>('/challenges').then((r) => r.data.challenges),
  })
}

export function useChallengeProgress() {
  return useQuery({
    queryKey: ['challenges', 'progress'],
    queryFn: () => api.get<{ progress: Record<string, boolean> }>('/challenges/progress').then((r) => r.data.progress),
  })
}

export function useSubmitChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lang, code }: { id: string; lang: string; code: string }) =>
      api.post(`/challenges/${id}/submit`, { lang, code }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges', 'progress'] }),
  })
}
