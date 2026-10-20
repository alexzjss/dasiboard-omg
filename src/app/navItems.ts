import type { IconName } from '../components/Icon'

export type NavItem = { label: string; icon: IconName; path: string }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: 'home', path: '/' },
  { label: 'Disciplinas', icon: 'book', path: '/disciplinas' },
  { label: 'Comunidade', icon: 'people', path: '/comunidade' },
  { label: 'Entidades', icon: 'building', path: '/entidades' },
]

export type Section = 'home' | 'disciplinas' | 'comunidade' | 'entidades' | 'perfil'

/** Maps a pathname to the top-level section it belongs to. */
export function sectionFromPath(pathname: string): Section {
  const first = pathname.split('/').filter(Boolean)[0]
  if (first === 'disciplinas' || first === 'comunidade' || first === 'entidades' || first === 'perfil') return first
  return 'home'
}

export const SECTION_LABEL: Record<Section, string> = {
  home: 'Início', disciplinas: 'Disciplinas', comunidade: 'Comunidade', entidades: 'Entidades', perfil: '',
}

export const SECTION_SPACE_THEME: Record<Section, string> = {
  home: 'home', disciplinas: 'disc', comunidade: 'docentes', entidades: 'entidades', perfil: 'home',
}
