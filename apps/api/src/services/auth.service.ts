import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken, refreshTokenTTL } from '../utils/jwt'
import { setRefreshToken, getRefreshToken, deleteRefreshToken } from '../utils/redis'
import { Errors } from '../utils/errors'

const SALT_ROUNDS = 12

export const authService = {
  async register(email: string, password: string, displayName: string) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw Errors.conflict('Este e-mail já está em uso')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    })

    return user
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw Errors.unauthorized('E-mail ou senha incorretos')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw Errors.unauthorized('E-mail ou senha incorretos')

    return authService._issueTokens(user.id, user.email, user.role)
  },

  async refresh(refreshToken: string) {
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw Errors.unauthorized('Refresh token inválido ou expirado')
    }

    // Check Redis — token still valid and belongs to this user
    const storedUserId = await getRefreshToken(refreshToken)
    if (!storedUserId || storedUserId !== payload.sub) {
      throw Errors.unauthorized('Refresh token revogado')
    }

    // Rotate: invalidate old, issue new
    await deleteRefreshToken(refreshToken)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    })
    if (!user) throw Errors.unauthorized('Usuário não encontrado')

    return authService._issueTokens(user.id, user.email, user.role)
  },

  async logout(refreshToken: string) {
    await deleteRefreshToken(refreshToken)
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        bio: true,
        turma: true,
        role: true,
        createdAt: true,
      },
    })
    if (!user) throw Errors.notFound('Usuário')
    return user
  },

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; turma?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, displayName: true, bio: true, turma: true, photoUrl: true },
    })
  },

  async _issueTokens(userId: string, email: string, role: string) {
    const jti = crypto.randomUUID()

    const accessToken = signAccessToken({ sub: userId, email, role })
    const refreshToken = signRefreshToken({ sub: userId, jti })

    await setRefreshToken(userId, refreshToken, refreshTokenTTL())

    return { accessToken, refreshToken }
  },
}
