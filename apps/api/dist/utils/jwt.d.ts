export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: string;
}
export interface RefreshTokenPayload {
    sub: string;
    jti: string;
}
/** Gera um access token JWT de curta duração (15min) */
export declare function signAccessToken(payload: AccessTokenPayload): string;
/** Gera um refresh token JWT de longa duração (7d) */
export declare function signRefreshToken(payload: RefreshTokenPayload): string;
/** Verifica e decodifica um access token */
export declare function verifyAccessToken(token: string): AccessTokenPayload;
/** Verifica e decodifica um refresh token */
export declare function verifyRefreshToken(token: string): RefreshTokenPayload;
/** TTL do refresh token em segundos (para o Redis) */
export declare function refreshTokenTTL(): number;
//# sourceMappingURL=jwt.d.ts.map