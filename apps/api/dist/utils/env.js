"use strict";
// Valida e exporta variáveis de ambiente com tipagem segura
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
function requireEnv(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
    return val;
}
function optionalEnv(key, fallback) {
    return process.env[key] ?? fallback;
}
exports.env = {
    NODE_ENV: optionalEnv('NODE_ENV', 'development'),
    PORT: parseInt(optionalEnv('PORT', '3000'), 10),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    REDIS_URL: requireEnv('REDIS_URL'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
    JWT_ACCESS_EXPIRES_IN: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
    DO_SPACES_KEY: process.env['DO_SPACES_KEY'],
    DO_SPACES_SECRET: process.env['DO_SPACES_SECRET'],
    DO_SPACES_BUCKET: optionalEnv('DO_SPACES_BUCKET', 'dasiboard'),
    DO_SPACES_ENDPOINT: optionalEnv('DO_SPACES_ENDPOINT', 'https://nyc3.digitaloceanspaces.com'),
    DO_SPACES_CDN: process.env['DO_SPACES_CDN_ENDPOINT'],
};
//# sourceMappingURL=env.js.map