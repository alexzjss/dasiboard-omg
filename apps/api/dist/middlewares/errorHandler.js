"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    // Zod validation error
    if (err instanceof zod_1.ZodError) {
        const issues = err.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
        }));
        return res.status(400).json({
            error: 'Dados inválidos',
            code: 'VALIDATION_ERROR',
            issues,
        });
    }
    // App error (known)
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
    }
    // Unknown error
    console.error('Unhandled error:', err);
    return res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
    });
}
//# sourceMappingURL=errorHandler.js.map