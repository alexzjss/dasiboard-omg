import type { Links } from '../../../lib/socialApi'

export type SocialKey = 'github' | 'linkedin' | 'instagram'

export const SOCIAL_LABEL: Record<SocialKey, string> = { github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram' }
const DOMAIN: Record<SocialKey, string> = { github: 'github.com', linkedin: 'linkedin.com', instagram: 'instagram.com' }

/** Devolve a URL só se for https, sem credenciais, e do domínio esperado (ou subdomínio). */
export function safeSocialUrl(key: SocialKey, value: unknown): string | null {
  if (typeof value !== 'string') return null
  let url: URL
  try { url = new URL(value.trim()) } catch { return null }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  const domain = DOMAIN[key]
  if (host !== domain && !host.endsWith(`.${domain}`)) return null
  return url.toString()
}

export function safeLinks(links: Links | null | undefined): { key: SocialKey; url: string }[] {
  const out: { key: SocialKey; url: string }[] = []
  for (const key of ['github', 'linkedin', 'instagram'] as const) {
    const url = safeSocialUrl(key, links?.[key])
    if (url) out.push({ key, url })
  }
  return out
}

/** Foto só por https; qualquer outra coisa cai nas iniciais. */
export function safePicture(value: string | null | undefined): string | null {
  if (!value) return null
  try { return new URL(value).protocol === 'https:' ? value : null } catch { return null }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
