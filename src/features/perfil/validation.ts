// Validação do perfil no cliente, espelhando server/social/validation.ts.
import type { Links } from '../../lib/socialApi'

export const BIO_MAX = 280
export const COURSE_MAX = 80

export type LinkKey = keyof Links
export const LINK_KEYS: readonly LinkKey[] = ['github', 'linkedin', 'instagram']
export const LINK_DOMAIN: Record<LinkKey, string> = { github: 'github.com', linkedin: 'linkedin.com', instagram: 'instagram.com' }
export const LINK_LABEL: Record<LinkKey, string> = { github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram' }

/** Devolve a mensagem de erro, ou null quando o link é válido (vazio também vale: remove o link). */
export function linkError(key: LinkKey, raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const domain = LINK_DOMAIN[key]
  const message = `Use um link https de ${domain}`
  if (value.length > 200) return message
  let url: URL
  try { url = new URL(value) } catch { return message }
  const hostOk = url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  if (url.protocol !== 'https:' || !hostOk || url.username || url.password || url.port) return message
  return null
}

export function bioError(bio: string): string | null {
  return bio.trim().length > BIO_MAX ? `A bio deve ter no máximo ${BIO_MAX} caracteres` : null
}

export function courseError(course: string): string | null {
  const value = course.trim()
  if (!value) return 'Informe o curso'
  return value.length > COURSE_MAX ? `O curso deve ter no máximo ${COURSE_MAX} caracteres` : null
}

/** Anos de ingresso oferecidos: do ano seguinte até 12 anos atrás, mais o ano já salvo se estiver fora. */
export function entryYearOptions(current: number | null, now = new Date()): number[] {
  const top = now.getFullYear() + 1
  const years: number[] = []
  for (let y = top; y >= top - 13; y--) years.push(y)
  if (current !== null && !years.includes(current)) years.push(current)
  return years.sort((a, b) => b - a)
}

type FieldKey = 'bio' | 'course' | 'entryYear' | LinkKey

/** Atribui a mensagem do servidor ao campo a que ela se refere, quando dá para saber. */
export function fieldOfServerError(message: string): FieldKey | null {
  const m = message.toLowerCase()
  if (m.includes('bio')) return 'bio'
  if (m.includes('curso')) return 'course'
  if (m.includes('ano')) return 'entryYear'
  for (const key of LINK_KEYS) if (m.includes(key) || m.includes(LINK_DOMAIN[key])) return key
  return null
}
