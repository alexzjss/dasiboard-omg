"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post('/register', auth_controller_1.authController.register);
// POST /api/auth/login
router.post('/login', auth_controller_1.authController.login);
// POST /api/auth/refresh  — usa o cookie httpOnly
router.post('/refresh', auth_controller_1.authController.refresh);
// POST /api/auth/logout
router.post('/logout', auth_controller_1.authController.logout);
// GET  /api/auth/me       — requer token válido
router.get('/me', auth_1.requireAuth, auth_controller_1.authController.me);
// PATCH /api/auth/me      — atualiza perfil
router.patch('/me', auth_1.requireAuth, auth_controller_1.authController.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map