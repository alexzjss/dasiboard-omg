import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from '../services/auth.service'

const REFRESH_COOKIE = 'dasiboard_refresh'

const cookieOpts = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days ms
  path: '/api/auth',
}

const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  displayName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(60),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(300).optional(),
  turma: z.string().optional(),
})

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, displayName } = registerSchema.parse(req.body)
      const user = await authService.register(email, password, displayName)
      res.status(201).json({ user })
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body)
      const { accessToken, refreshToken } = await authService.login(email, password)

      res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts)
      res.json({ accessToken })
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE]
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token ausente' })
      }

      const { accessToken, refreshToken: newRefresh } = await authService.refresh(refreshToken)

      res.cookie(REFRESH_COOKIE, newRefresh, cookieOpts)
      res.json({ accessToken })
    } catch (err) {
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE]
      if (refreshToken) await authService.logout(refreshToken)

      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.json({ message: 'Sessão encerrada' })
    } catch (err) {
      next(err)
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.me(req.user!.sub)
      res.json({ user })
    } catch (err) {
      next(err)
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body)
      const user = await authService.updateProfile(req.user!.sub, data)
      res.json({ user })
    } catch (err) {
      next(err)
    }
  },
}
