"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = notFound;
function notFound(req, res) {
    res.status(404).json({
        error: `Rota não encontrada: ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
    });
}
//# sourceMappingURL=notFound.js.map