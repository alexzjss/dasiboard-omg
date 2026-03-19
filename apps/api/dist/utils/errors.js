"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
exports.Errors = {
    badRequest: (msg = 'Requisição inválida', code) => new AppError(400, msg, code),
    unauthorized: (msg = 'Não autenticado') => new AppError(401, msg, 'UNAUTHORIZED'),
    forbidden: (msg = 'Acesso negado') => new AppError(403, msg, 'FORBIDDEN'),
    notFound: (resource = 'Recurso') => new AppError(404, `${resource} não encontrado`),
    conflict: (msg) => new AppError(409, msg, 'CONFLICT'),
    internal: (msg = 'Erro interno do servidor') => new AppError(500, msg, 'INTERNAL_ERROR'),
};
//# sourceMappingURL=errors.js.map