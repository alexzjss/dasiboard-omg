const port = Number(process.env.PORT || 3000)
const rawGoogleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID
const rawSessionSecret = process.env.SESSION_SECRET
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

if (!rawGoogleClientId || !rawSessionSecret) {
  throw new Error('GOOGLE_CLIENT_ID and SESSION_SECRET are required')
}
if (rawSessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters')
}

export const googleClientId: string = rawGoogleClientId
export const sessionSecret: string = rawSessionSecret
export { port, frontendUrl }
export const isProduction = process.env.NODE_ENV === 'production'

// Demo mode (docs/plans/2026-10-20-sistema-social.md, section 5): never allowed in production.
// Vercel always sets VERCEL, so it is treated as production even if NODE_ENV is odd.
export const devFakeSession = process.env.DEV_FAKE_SESSION === '1'
if (devFakeSession && (isProduction || process.env.VERCEL)) {
  throw new Error('DEV_FAKE_SESSION=1 must never be enabled in production')
}
if (devFakeSession) console.warn('DEV_FAKE_SESSION is active: requests without a cookie act as the local dev user')

// Pepper for the HMAC of invite codes. Required (32+ chars) in production;
// in development it is derived from SESSION_SECRET, with a warning.
function resolveInvitePepper() {
  const configured = process.env.INVITE_CODE_PEPPER
  if (configured) {
    if (configured.length < 32) throw new Error('INVITE_CODE_PEPPER must contain at least 32 characters')
    return configured
  }
  if (isProduction || process.env.VERCEL) throw new Error('INVITE_CODE_PEPPER is required (at least 32 characters)')
  console.warn('INVITE_CODE_PEPPER not set: deriving it from SESSION_SECRET (development only)')
  return `invite-pepper:${rawSessionSecret}`
}
export const inviteCodePepper: string = resolveInvitePepper()

export const superadminEmails: ReadonlySet<string> = new Set(
  (process.env.SUPERADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
)
export function isSuperadminEmail(email: string) {
  return superadminEmails.has(email.trim().toLowerCase())
}

function toOrigin(value: string) {
  const candidate = value.trim()
  if (!candidate) return null
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

const configuredOrigins = [
  frontendUrl,
  'https://dasiboard.vercel.app',
  'https://sieach.vercel.app',
  ...(process.env.ALLOWED_ORIGINS || '').split(','),
  process.env.VERCEL_URL || '',
  process.env.VERCEL_PROJECT_PRODUCTION_URL || '',
]
  .map(toOrigin)
  .filter((origin): origin is string => origin !== null)
export const allowedOrigins = new Set([...configuredOrigins, ...(isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])])
