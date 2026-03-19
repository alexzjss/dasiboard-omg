import { prisma } from './prisma'

/**
 * Salva um refresh token no banco com expiração
 * @param userId ID do usuário
 * @param token Token JWT
 * @param ttlSeconds Tempo de vida em segundos (padrão: 7 dias)
 */
export async function setRefreshToken(
  userId: string,
  token: string,
  ttlSeconds: number = 7 * 24 * 60 * 60
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })
}

/**
 * Recupera e valida um refresh token
 * Retorna o userId se válido, null caso contrário
 */
export async function getRefreshToken(token: string): Promise<string | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
  })

  // Token não existe
  if (!record) return null

  // Token expirado
  if (record.expiresAt < new Date()) {
    await deleteRefreshToken(token)
    return null
  }

  return record.userId
}

/**
 * Deleta um refresh token específico (logout de um dispositivo)
 */
export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  })
}

/**
 * Deleta todos os refresh tokens de um usuário (logout de todos os dispositivos)
 */
export async function deleteAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })
}

/**
 * Limpa tokens expirados (executar periodicamente)
 * Recomendado: a cada 1 hora
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}
