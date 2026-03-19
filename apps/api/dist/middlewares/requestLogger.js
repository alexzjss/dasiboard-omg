"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
/** Middleware: loga método, path, status e tempo de resposta */
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const color = res.statusCode >= 500 ? '\x1b[31m' : // red
            res.statusCode >= 400 ? '\x1b[33m' : // yellow
                res.statusCode >= 300 ? '\x1b[36m' : // cyan
                    '\x1b[32m'; // green
        console.log(`${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`);
    });
    next();
}
//# sourceMappingURL=requestLogger.js.map