import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { authController } from '../controllers/auth.controller'
import { requireAuth } from '../middlewares/auth'

const router: ExpressRouter = Router()

// POST /api/auth/register
router.post('/register', authController.register)

// POST /api/auth/login
router.post('/login', authController.login)

// POST /api/auth/refresh  — usa o cookie httpOnly
router.post('/refresh', authController.refresh)

// POST /api/auth/logout
router.post('/logout', authController.logout)

// GET  /api/auth/me       — requer token válido
router.get('/me', requireAuth, authController.me)

// PATCH /api/auth/me      — atualiza perfil
router.patch('/me', requireAuth, authController.updateProfile)

export default router
