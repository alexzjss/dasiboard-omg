// Heuristic: only local databases or hosts whose name says dev/staging/test run without confirmation.
export function looksLikeProduction(rawUrl: string | undefined) {
  if (!rawUrl) return true
  let host: string
  try { host = new URL(rawUrl).hostname.toLowerCase() } catch { return true }
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')) return false
  return !/(^|[.-])(dev|development|staging|stage|test|sandbox|local|preview)([.-]|$)/.test(host)
}

