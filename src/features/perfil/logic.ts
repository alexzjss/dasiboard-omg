import { ApiError, type CardData, type Links, type MyProfile, type PersonProfile, type ProfilePatch } from '../../lib/socialApi'
import { LINK_KEYS, type LinkKey } from './validation'

export type Draft = { bio: string; course: string; entryYear: string; links: Record<LinkKey, string>; technologies: string[] }

/** Monta o PATCH só com o que mudou; null quando nada mudou. */
export function buildPatch(saved: MyProfile['profile'], draft: Draft): ProfilePatch | null {
  const patch: ProfilePatch = {}
  if (draft.bio.trim() !== (saved.bio ?? '')) patch.bio = draft.bio.trim()
  if (draft.course.trim() !== saved.course) patch.course = draft.course.trim()
  const year = draft.entryYear === '' ? null : Number(draft.entryYear)
  if (year !== saved.entryYear) patch.entryYear = year
  const links: Links = {}
  let linksChanged = false
  for (const key of LINK_KEYS) {
    const value = draft.links[key].trim()
    if (value) links[key] = value
    if (value !== (saved.links[key] ?? '')) linksChanged = true
  }
  if (linksChanged) patch.links = links
  if (draft.technologies.length !== saved.technologies.length || draft.technologies.some((id, i) => id !== saved.technologies[i])) patch.technologies = draft.technologies
  return Object.keys(patch).length ? patch : null
}

/** Monta o que um visitante não conectado vê, aplicando a privacidade do próprio aluno. */
export function visitorView(me: MyProfile, accepted: { handle: string; name: string; picture: string | null }[], card: CardData): PersonProfile {
  const { profile } = me
  return {
    profile: {
      handle: profile.handle, name: profile.name, picture: profile.picture, course: profile.course,
      entryYear: profile.entryYear, bio: profile.bio, links: profile.links, technologies: profile.technologies,
      self: true,
    },
    // 'self' faz o ConnectButton não renderizar: a prévia nunca dispara pedidos reais.
    connection: 'self',
    card,
    badges: me.badges,
    entities: me.entities.map(({ entityId, name, title }) => ({ entityId, name, title })),
    courses: profile.showCourses === 'all' ? me.courses.map((c) => ({ ...c, common: false })) : null,
    commonCourses: null,
    classmatesInCommon: null,
    connections: profile.showConnections === 'all'
      ? { count: accepted.length, people: accepted.map(({ handle, name, picture }) => ({ handle, name, picture })) }
      : null,
    visibility: { courses: profile.showCourses === 'all', connections: profile.showConnections === 'all' },
  }
}

/** Traduz erros do servidor em frases claras para quem administra. */
export function adminErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Você não tem permissão para esta ação. Só superadmins mexem em outros administradores.'
    if (err.status === 409) return err.message && err.message !== 'Não foi possível concluir a operação'
      ? `Não foi possível: ${err.message.charAt(0).toLowerCase()}${err.message.slice(1)}`
      : 'Não foi possível: o estado do aluno mudou. Atualize a lista e tente de novo.'
    if (err.status === 404) return 'Não encontrado. Pode ser que o aluno já tenha saído; atualize a lista.'
    if (err.status === 429) return 'Muitas tentativas. Aguarde alguns minutos.'
    if (err.status === 0) return 'Sem conexão com o servidor. Tente de novo.'
    return err.message
  }
  return 'Não deu certo. Tente de novo.'
}

