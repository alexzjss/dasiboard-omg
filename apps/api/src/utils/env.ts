// Valida e exporta variáveis de ambiente com tipagem segura

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
  return val
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_URL: requireEnv('REDIS_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  DO_SPACES_KEY: process.env['DO_SPACES_KEY'],
  DO_SPACES_SECRET: process.env['DO_SPACES_SECRET'],
  DO_SPACES_BUCKET: optionalEnv('DO_SPACES_BUCKET', 'dasiboard'),
  DO_SPACES_ENDPOINT: optionalEnv('DO_SPACES_ENDPOINT', 'https://nyc3.digitaloceanspaces.com'),
  DO_SPACES_CDN: process.env['DO_SPACES_CDN_ENDPOINT'],
}
