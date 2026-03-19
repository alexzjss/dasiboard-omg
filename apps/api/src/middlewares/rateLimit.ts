import rateLimit from 'express-rate-limit'

/** Rate limit geral — 200 req / 15 min por IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.', code: 'RATE_LIMITED' },
})

/** Rate limit para auth — 10 tentativas / 15 min por IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMITED' },
  skipSuccessfulRequests: true, // só conta falhas
})
