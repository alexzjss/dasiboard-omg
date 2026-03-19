import { Redis } from 'ioredis';
export declare const redis: Redis;
/** Salva um refresh token no Redis com TTL em segundos */
export declare function setRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<void>;
/** Verifica se um refresh token é válido e retorna o userId */
export declare function getRefreshToken(token: string): Promise<string | null>;
/** Invalida um refresh token */
export declare function deleteRefreshToken(token: string): Promise<void>;
/** Invalida todos os refresh tokens de um usuário (logout de todos os devices) */
export declare function deleteAllUserRefreshTokens(userId: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map