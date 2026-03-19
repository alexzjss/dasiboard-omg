"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const events_controller_1 = require("../controllers/events.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Leitura pública (com auth opcional para filtros personalizados)
router.get('/', auth_1.optionalAuth, events_controller_1.eventsController.list);
router.get('/pending', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), events_controller_1.eventsController.listPending);
router.get('/:id', events_controller_1.eventsController.getById);
// Usuário autenticado pode submeter evento para aprovação
router.post('/pending', auth_1.requireAuth, events_controller_1.eventsController.submitPending);
// Moderador/Admin
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), events_controller_1.eventsController.create);
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), events_controller_1.eventsController.update);
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), events_controller_1.eventsController.delete);
router.put('/pending/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), events_controller_1.eventsController.approve);
router.put('/pending/:id/reject', auth_1.requireAuth, (0, auth_1.requireRole)('MODERATOR', 'ADMIN'), events_controller_1.eventsController.reject);
exports.default = router;
//# sourceMappingURL=events.js.map