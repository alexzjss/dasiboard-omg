"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.refreshTokenTTL = refreshTokenTTL;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
/** Gera um access token JWT de curta duração (15min) */
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN,
        issuer: 'dasiboard',
        audience: 'dasiboard-web',
    });
}
/** Gera um refresh token JWT de longa duração (7d) */
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
        issuer: 'dasiboard',
        audience: 'dasiboard-web',
    });
}
/** Verifica e decodifica um access token */
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, {
        issuer: 'dasiboard',
        audience: 'dasiboard-web',
    });
}
/** Verifica e decodifica um refresh token */
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET, {
        issuer: 'dasiboard',
        audience: 'dasiboard-web',
    });
}
/** TTL do refresh token em segundos (para o Redis) */
function refreshTokenTTL() {
    // 7 days in seconds
    return 7 * 24 * 60 * 60;
}
//# sourceMappingURL=jwt.js.map