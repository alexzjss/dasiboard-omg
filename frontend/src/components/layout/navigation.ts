import type { ElementType } from 'react'
import { LayoutDashboard, Rss, KanbanSquare, BookOpen, CalendarDays, User, GraduationCap, Users, BookMarked, Monitor, Settings } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: ElementType
  end: boolean
  parent?: string
}

export const NAV_PRIMARY: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/social', label: 'Social', icon: Users, end: false },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays, end: false },
  { to: '/estudo', label: 'Estudo', icon: BookOpen, end: false },
  { to: '/perfil', label: 'Perfil', icon: User, end: false },
]

export const NAV_SECONDARY: NavItem[] = [
  { to: '/social/feed', label: 'Feed', icon: Rss, end: false, parent: '/social' },
  { to: '/social/entities', label: 'Entidades', icon: Users, end: false, parent: '/social' },
  { to: '/social/turma', label: 'Turma', icon: GraduationCap, end: false, parent: '/social' },
  { to: '/social/room', label: 'Salas', icon: Monitor, end: false, parent: '/social' },
  { to: '/eventos/calendar', label: 'Calendário', icon: CalendarDays, end: false, parent: '/eventos' },
  { to: '/estudo/grades', label: 'Disciplinas', icon: BookOpen, end: false, parent: '/estudo' },
  { to: '/estudo/kanban', label: 'Kanban', icon: KanbanSquare, end: false, parent: '/estudo' },
  { to: '/estudo/docentes', label: 'Docentes', icon: BookMarked, end: false, parent: '/estudo' },
  { to: '/perfil/settings', label: 'Configurações', icon: Settings, end: false, parent: '/perfil' },
]