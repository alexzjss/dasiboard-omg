"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.setRefreshToken = setRefreshToken;
exports.getRefreshToken = getRefreshToken;
exports.deleteRefreshToken = deleteRefreshToken;
exports.deleteAllUserRefreshTokens = deleteAllUserRefreshTokens;
const ioredis_1 = require("ioredis");
const env_1 = require("./env");
exports.redis = new ioredis_1.Redis(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
});
exports.redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Salva um refresh token no Redis com TTL em segundos */
async function setRefreshToken(userId, token, ttlSeconds) {
    await exports.redis.setex(`refresh:${token}`, ttlSeconds, userId);
}
/** Verifica se um refresh token é válido e retorna o userId */
async function getRefreshToken(token) {
    return exports.redis.get(`refresh:${token}`);
}
/** Invalida um refresh token */
async function deleteRefreshToken(token) {
    await exports.redis.del(`refresh:${token}`);
}
/** Invalida todos os refresh tokens de um usuário (logout de todos os devices) */
async function deleteAllUserRefreshTokens(userId) {
    const keys = await exports.redis.keys(`refresh:*`);
    const pipeline = exports.redis.pipeline();
    for (const key of keys) {
        const uid = await exports.redis.get(key);
        if (uid === userId)
            pipeline.del(key);
    }
    await pipeline.exec();
}
//# sourceMappingURL=redis.js.map