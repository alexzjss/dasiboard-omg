import jwt from 'jsonwebtoken'
import { env } from './env'

export interface AccessTokenPayload {
  sub: string    // userId
  email: string
  role: string
}

export interface RefreshTokenPayload {
  sub: string    // userId
  jti: string    // unique token id
}

/** Gera um access token JWT de curta duração (15min) */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'dasiboard',
    audience: 'dasiboard-web',
  } as jwt.SignOptions)
}

/** Gera um refresh token JWT de longa duração (7d) */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'dasiboard',
    audience: 'dasiboard-web',
  } as jwt.SignOptions)
}

/** Verifica e decodifica um access token */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'dasiboard',
    audience: 'dasiboard-web',
  }) as AccessTokenPayload
}

/** Verifica e decodifica um refresh token */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'dasiboard',
    audience: 'dasiboard-web',
  }) as RefreshTokenPayload
}

/** TTL do refresh token em segundos (para o Redis) */
export function refreshTokenTTL(): number {
  // 7 days in seconds
  return 7 * 24 * 60 * 60
}
