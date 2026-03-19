"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const REFRESH_COOKIE = 'dasiboard_refresh';
const cookieOpts = {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days ms
    path: '/api/auth',
};
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('E-mail inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    displayName: zod_1.z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(60),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(60).optional(),
    bio: zod_1.z.string().max(300).optional(),
    turma: zod_1.z.string().optional(),
});
exports.authController = {
    async register(req, res, next) {
        try {
            const { email, password, displayName } = registerSchema.parse(req.body);
            const user = await auth_service_1.authService.register(email, password, displayName);
            res.status(201).json({ user });
        }
        catch (err) {
            next(err);
        }
    },
    async login(req, res, next) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const { accessToken, refreshToken } = await auth_service_1.authService.login(email, password);
            res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
            res.json({ accessToken });
        }
        catch (err) {
            next(err);
        }
    },
    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies[REFRESH_COOKIE];
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token ausente' });
            }
            const { accessToken, refreshToken: newRefresh } = await auth_service_1.authService.refresh(refreshToken);
            res.cookie(REFRESH_COOKIE, newRefresh, cookieOpts);
            res.json({ accessToken });
        }
        catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies[REFRESH_COOKIE];
            if (refreshToken)
                await auth_service_1.authService.logout(refreshToken);
            res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
            res.json({ message: 'Sessão encerrada' });
        }
        catch (err) {
            next(err);
        }
    },
    async me(req, res, next) {
        try {
            const user = await auth_service_1.authService.me(req.user.sub);
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    },
    async updateProfile(req, res, next) {
        try {
            const data = updateProfileSchema.parse(req.body);
            const user = await auth_service_1.authService.updateProfile(req.user.sub, data);
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=auth.controller.js.map