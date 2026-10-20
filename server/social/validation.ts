import type { Links } from './db.js'
import type { Visibility } from './privacy.js'
import { TECH_IDS } from './technologies.js'

export const VISIBILITY_VALUES: readonly Visibility[] = ['all', 'connections', 'none']
export const ENTITY_ID_PATTERN = /^[a-z0-9-]{1,40}$/
export const MAX_TECHNOLOGIES = 12
export const MAX_TITLE_LENGTH = 40
export const COURSE_CODE_PATTERN = /^[A-Z0-9]{3,12}$/

const LINK_HOSTS = { github: 'github.com', linkedin: 'linkedin.com', instagram: 'instagram.com' } as const
const PATCH_KEYS = new Set(['bio', 'course', 'entryYear', 'links', 'technologies', 'showCourses', 'showConnections'])

export type ProfileInput = {
  bio?: string | null
  course?: string
  entry_year?: number | null
  links?: Links
  technologies?: string[]
  show_courses?: Visibility
  show_connections?: Visibility
}
export type Validated<T> = { ok: true; value: T } | { ok: false; error: string }

// https only, host must be the network's own domain (or a subdomain such as www.), no credentials or port.
export function validateLink(network: keyof typeof LINK_HOSTS, raw: unknown): Validated<string | null> {
  if (raw === null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string' || raw.length > 200) return { ok: false, error: `Link de ${network} inválido` }
  let url: URL
  try { url = new URL(raw.trim()) } catch { return { ok: false, error: `Link de ${network} inválido` } }
  const domain = LINK_HOSTS[network]
  const hostOk = url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  if (url.protocol !== 'https:' || !hostOk || url.username || url.password || url.port) {
    return { ok: false, error: `Use um link https de ${domain}` }
  }
  return { ok: true, value: url.href }
}

export function validateProfilePatch(body: unknown, now = new Date()): Validated<ProfileInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'Dados inválidos' }
  const input = body as Record<string, unknown>
  const keys = Object.keys(input)
  if (keys.length === 0) return { ok: false, error: 'Nada para atualizar' }
  if (keys.some((key) => !PATCH_KEYS.has(key))) return { ok: false, error: 'Campo desconhecido' }
  const out: ProfileInput = {}

  if ('bio' in input) {
    if (input.bio !== null && typeof input.bio !== 'string') return { ok: false, error: 'Bio inválida' }
    // eslint-disable-next-line no-control-regex
    const bio = input.bio === null ? '' : input.bio.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
    if (bio.length > 280) return { ok: false, error: 'A bio deve ter no máximo 280 caracteres' }
    out.bio = bio || null
  }
  if ('course' in input) {
    const course = typeof input.course === 'string' ? input.course.trim() : ''
    // eslint-disable-next-line no-control-regex
    if (!course || course.length > 80 || /[\u0000-\u001F\u007F]/.test(course)) return { ok: false, error: 'Curso inválido' }
    out.course = course
  }
  if ('entryYear' in input) {
    const year = input.entryYear
    if (year === null) out.entry_year = null
    else if (typeof year === 'number' && Number.isInteger(year) && year >= 1934 && year <= now.getFullYear() + 1) out.entry_year = year
    else return { ok: false, error: 'Ano de ingresso inválido' }
  }
  if ('links' in input) {
    const links = input.links
    if (typeof links !== 'object' || links === null || Array.isArray(links)) return { ok: false, error: 'Links inválidos' }
    const next: Links = {}
    for (const [network, raw] of Object.entries(links)) {
      if (!(network in LINK_HOSTS)) return { ok: false, error: 'Rede desconhecida' }
      const result = validateLink(network as keyof typeof LINK_HOSTS, raw)
      if (!result.ok) return result
      if (result.value) next[network as keyof Links] = result.value
    }
    out.links = next
  }
  if ('technologies' in input) {
    const list = input.technologies
    const valid = Array.isArray(list) && list.length <= MAX_TECHNOLOGIES && list.every((id) => typeof id === 'string' && TECH_IDS.has(id)) && new Set(list).size === list.length
    if (!valid) return { ok: false, error: 'Tecnologias inválidas' }
    out.technologies = list as string[]
  }
  for (const [key, column] of [['showCourses', 'show_courses'], ['showConnections', 'show_connections']] as const) {
    if (key in input) {
      const value = input[key]
      if (typeof value !== 'string' || !VISIBILITY_VALUES.includes(value as Visibility)) return { ok: false, error: 'Privacidade inválida' }
      out[column] = value as Visibility
    }
  }
  return { ok: true, value: out }
}
