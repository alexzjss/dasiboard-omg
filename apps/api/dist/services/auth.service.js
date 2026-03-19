"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../utils/redis");
const errors_1 = require("../utils/errors");
const SALT_ROUNDS = 12;
exports.authService = {
    async register(email, password, displayName) {
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw errors_1.Errors.conflict('Este e-mail já está em uso');
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash, displayName },
            select: { id: true, email: true, displayName: true, role: true, createdAt: true },
        });
        return user;
    },
    async login(email, password) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw errors_1.Errors.unauthorized('E-mail ou senha incorretos');
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            throw errors_1.Errors.unauthorized('E-mail ou senha incorretos');
        return exports.authService._issueTokens(user.id, user.email, user.role);
    },
    async refresh(refreshToken) {
        let payload;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        }
        catch {
            throw errors_1.Errors.unauthorized('Refresh token inválido ou expirado');
        }
        // Check Redis — token still valid and belongs to this user
        const storedUserId = await (0, redis_1.getRefreshToken)(refreshToken);
        if (!storedUserId || storedUserId !== payload.sub) {
            throw errors_1.Errors.unauthorized('Refresh token revogado');
        }
        // Rotate: invalidate old, issue new
        await (0, redis_1.deleteRefreshToken)(refreshToken);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true },
        });
        if (!user)
            throw errors_1.Errors.unauthorized('Usuário não encontrado');
        return exports.authService._issueTokens(user.id, user.email, user.role);
    },
    async logout(refreshToken) {
        await (0, redis_1.deleteRefreshToken)(refreshToken);
    },
    async me(userId) {
        const user = await prisma_1.prisma.user.findUnique({
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
        });
        if (!user)
            throw errors_1.Errors.notFound('Usuário');
        return user;
    },
    async updateProfile(userId, data) {
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, email: true, displayName: true, bio: true, turma: true, photoUrl: true },
        });
    },
    async _issueTokens(userId, email, role) {
        const jti = crypto.randomUUID();
        const accessToken = (0, jwt_1.signAccessToken)({ sub: userId, email, role });
        const refreshToken = (0, jwt_1.signRefreshToken)({ sub: userId, jti });
        await (0, redis_1.setRefreshToken)(userId, refreshToken, (0, jwt_1.refreshTokenTTL)());
        return { accessToken, refreshToken };
    },
};
//# sourceMappingURL=auth.service.js.map