/** Rate limit geral — 200 req / 15 min por IP */
export declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Rate limit para auth — 10 tentativas / 15 min por IP */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimit.d.ts.map