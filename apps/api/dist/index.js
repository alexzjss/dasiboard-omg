"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./utils/env");
const prisma_1 = require("./utils/prisma");
const redis_1 = require("./utils/redis");
const PORT = env_1.env.PORT;
async function main() {
    // Verify DB connection
    await prisma_1.prisma.$connect();
    console.log('✅ PostgreSQL conectado');
    // Verify Redis connection
    await redis_1.redis.ping();
    console.log('✅ Redis conectado');
    app_1.default.listen(PORT, () => {
        console.log(`🚀 API rodando em http://localhost:${PORT}`);
        console.log(`   Ambiente: ${env_1.env.NODE_ENV}`);
    });
}
main().catch((err) => {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma_1.prisma.$disconnect();
    redis_1.redis.disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await prisma_1.prisma.$disconnect();
    redis_1.redis.disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map