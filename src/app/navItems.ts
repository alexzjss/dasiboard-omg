import type { IconName } from '../components/Icon'

export type NavItem = { label: string; icon: IconName; path: string }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: 'home', path: '/' },
  { label: 'Disciplinas', icon: 'book', path: '/disciplinas' },
  { label: 'Comunidade', icon: 'people', path: '/comunidade' },
  { label: 'Entidades', icon: 'building', path: '/entidades' },
  { label: 'Calendário', icon: 'calendar', path: '/calendario' },
]

/** Barra inferior do celular: Calendário ocupa o lugar de Disciplinas, que passa a morar no menu do usuário. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS
  .filter((item) => item.path !== '/calendario')
  .map((item) => (item.path === '/disciplinas' ? NAV_ITEMS.find((i) => i.path === '/calendario')! : item))

export type Section = 'home' | 'disciplinas' | 'comunidade' | 'entidades' | 'calendario' | 'perfil' | 'notificacoes'

/** Maps a pathname to the top-level section it belongs to. */
export function sectionFromPath(pathname: string): Section {
  const first = pathname.split('/').filter(Boolean)[0]
  if (first === 'disciplinas' || first === 'comunidade' || first === 'entidades' || first === 'calendario' || first === 'perfil' || first === 'notificacoes') return first
  return 'home'
}

export const SECTION_LABEL: Record<Section, string> = {
  home: 'Início', disciplinas: 'Disciplinas', comunidade: 'Comunidade', entidades: 'Entidades', calendario: 'Calendário', perfil: '', notificacoes: '',
}

export const SECTION_SPACE_THEME: Record<Section, string> = {
  home: 'home', disciplinas: 'disc', comunidade: 'docentes', entidades: 'entidades', calendario: 'home', perfil: 'home', notificacoes: 'home',
}
