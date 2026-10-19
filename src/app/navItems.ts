import type { IconName } from '../components/Icon'

export type NavItem = { label: string; icon: IconName; path: string }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: 'home', path: '/' },
  { label: 'Disciplinas', icon: 'book', path: '/disciplinas' },
  { label: 'Docentes', icon: 'people', path: '/docentes' },
  { label: 'Entidades', icon: 'building', path: '/entidades' },
]

export type Section = 'home' | 'disciplinas' | 'docentes' | 'entidades' | 'perfil'

/** Maps a pathname to the top-level section it belongs to. */
export function sectionFromPath(pathname: string): Section {
  const first = pathname.split('/').filter(Boolean)[0]
  if (first === 'disciplinas' || first === 'docentes' || first === 'entidades' || first === 'perfil') return first
  return 'home'
}

export const SECTION_LABEL: Record<Section, string> = {
  home: 'Início', disciplinas: 'Disciplinas', docentes: 'Docentes', entidades: 'Entidades', perfil: '',
}

export const SECTION_SPACE_THEME: Record<Section, string> = {
  home: 'home', disciplinas: 'disc', docentes: 'docentes', entidades: 'entidades', perfil: 'home',
}

/** Class of the page shell the section used before the nav moved to the layout (keeps per-area nav colours). */
export const SECTION_NAV_SHELL: Record<Section, string | undefined> = {
  home: undefined, disciplinas: 'disc-shell', docentes: 'doc-shell', entidades: 'ent-shell', perfil: undefined,
}
