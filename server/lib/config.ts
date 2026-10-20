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
