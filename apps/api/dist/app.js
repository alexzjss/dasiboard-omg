"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./utils/env");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFound_1 = require("./middlewares/notFound");
const requestLogger_1 = require("./middlewares/requestLogger");
const rateLimit_1 = require("./middlewares/rateLimit");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const kanban_1 = __importDefault(require("./routes/kanban"));
const gpa_1 = __importDefault(require("./routes/gpa"));
const faltas_1 = __importDefault(require("./routes/faltas"));
const newsletter_1 = __importDefault(require("./routes/newsletter"));
const docentes_1 = __importDefault(require("./routes/docentes"));
const estudos_1 = __importDefault(require("./routes/estudos"));
const entidades_1 = __importDefault(require("./routes/entidades"));
const tools_1 = __importDefault(require("./routes/tools"));
const challenges_1 = __importDefault(require("./routes/challenges"));
const app = (0, express_1.default)();
// ─── Security ─────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(rateLimit_1.generalLimiter);
// ─── Parsing & compression ────────────────────────────────────────────────────
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// ─── Logging ──────────────────────────────────────────────────────────────────
if (env_1.env.NODE_ENV !== 'test') {
    app.use(requestLogger_1.requestLogger);
}
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});
// ─── API Routes ───────────────────────────────────────────────────────────────
const api = express_1.default.Router();
api.use('/auth', rateLimit_1.authLimiter);
api.use('/auth', auth_1.default);
api.use('/events', events_1.default);
api.use('/schedule', schedule_1.default);
api.use('/kanban', kanban_1.default);
api.use('/gpa', gpa_1.default);
api.use('/faltas', faltas_1.default);
api.use('/newsletter', newsletter_1.default);
api.use('/docentes', docentes_1.default);
api.use('/estudos', estudos_1.default);
api.use('/entidades', entidades_1.default);
api.use('/tools', tools_1.default);
api.use('/challenges', challenges_1.default);
app.use('/api', api);
// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map