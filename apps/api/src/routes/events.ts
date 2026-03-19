import { Router } from 'express'
import { eventsController } from '../controllers/events.controller'
import { requireAuth, requireRole, optionalAuth } from '../middlewares/auth'

const router = Router()

// Leitura pública (com auth opcional para filtros personalizados)
router.get('/', optionalAuth, eventsController.list)
router.get('/pending', requireAuth, requireRole('MODERATOR', 'ADMIN'), eventsController.listPending)
router.get('/:id', eventsController.getById)

// Usuário autenticado pode submeter evento para aprovação
router.post('/pending', requireAuth, eventsController.submitPending)

// Moderador/Admin
router.post('/', requireAuth, requireRole('MODERATOR', 'ADMIN'), eventsController.create)
router.put('/:id', requireAuth, requireRole('MODERATOR', 'ADMIN'), eventsController.update)
router.delete('/:id', requireAuth, requireRole('ADMIN'), eventsController.delete)
router.put('/pending/:id/approve', requireAuth, requireRole('MODERATOR', 'ADMIN'), eventsController.approve)
router.put('/pending/:id/reject', requireAuth, requireRole('MODERATOR', 'ADMIN'), eventsController.reject)

export default router
