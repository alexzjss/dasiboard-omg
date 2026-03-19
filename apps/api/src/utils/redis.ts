import { Redis } from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
})

redis.on('error', (err) => {
  console.error('❌ Redis error:', err)
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Salva um refresh token no Redis com TTL em segundos */
export async function setRefreshToken(userId: string, token: string, ttlSeconds: number) {
  await redis.setex(`refresh:${token}`, ttlSeconds, userId)
}

/** Verifica se um refresh token é válido e retorna o userId */
export async function getRefreshToken(token: string): Promise<string | null> {
  return redis.get(`refresh:${token}`)
}

/** Invalida um refresh token */
export async function deleteRefreshToken(token: string) {
  await redis.del(`refresh:${token}`)
}

/** Invalida todos os refresh tokens de um usuário (logout de todos os devices) */
export async function deleteAllUserRefreshTokens(userId: string) {
  const keys = await redis.keys(`refresh:*`)
  const pipeline = redis.pipeline()
  for (const key of keys) {
    const uid = await redis.get(key)
    if (uid === userId) pipeline.del(key)
  }
  await pipeline.exec()
}
