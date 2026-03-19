import app from './app'
import { env } from './utils/env'
import { prisma } from './utils/prisma'
import { redis } from './utils/redis'

const PORT = env.PORT

async function main() {
  // Verify DB connection
  await prisma.$connect()
  console.log('✅ PostgreSQL conectado')

  // Verify Redis connection
  await redis.ping()
  console.log('✅ Redis conectado')

  app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`)
    console.log(`   Ambiente: ${env.NODE_ENV}`)
  })
}

main().catch((err) => {
  console.error('❌ Erro ao iniciar servidor:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  redis.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  redis.disconnect()
  process.exit(0)
})
