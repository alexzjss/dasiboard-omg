"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.optionalAuth = optionalAuth;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
/** Middleware: exige autenticação via Bearer token no header Authorization */
function requireAuth(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer '))
            throw errors_1.Errors.unauthorized();
        const token = header.slice(7);
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            next(errors_1.Errors.unauthorized('Token expirado'));
        }
        else if (err instanceof Error && err.name === 'JsonWebTokenError') {
            next(errors_1.Errors.unauthorized('Token inválido'));
        }
        else {
            next(err);
        }
    }
}
/** Middleware: exige uma das roles listadas */
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(errors_1.Errors.unauthorized());
        if (!roles.includes(req.user.role))
            return next(errors_1.Errors.forbidden());
        next();
    };
}
/** Middleware: autenticação opcional — não falha se não houver token */
function optionalAuth(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (header?.startsWith('Bearer ')) {
            const token = header.slice(7);
            req.user = (0, jwt_1.verifyAccessToken)(token);
        }
    }
    catch {
        // Token inválido/expirado em rotas opcionais: ignora silenciosamente
    }
    next();
}
//# sourceMappingURL=auth.js.map