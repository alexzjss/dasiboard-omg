import app from './app'
import { env } from './utils/env'
import { prisma } from './utils/prisma'
import { cleanupExpiredTokens } from './utils/redis'

const PORT = env.PORT

let cleanupInterval: NodeJS.Timeout

async function main() {
  // Verify DB connection
  await prisma.$connect()
  console.log('✅ PostgreSQL conectado')

  // Iniciar job de limpeza de tokens a cada 1 hora
  cleanupInterval = setInterval(async () => {
    try {
      const deleted = await cleanupExpiredTokens()
      if (deleted > 0) {
        console.log(`🧹 Limpeza: ${deleted} refresh tokens expirados removidos`)
      }
    } catch (err) {
      console.error('❌ Erro na limpeza de tokens:', err)
    }
  }, 60 * 60 * 1000) // 1 hora

  app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`)
    console.log(`   Ambiente: ${env.NODE_ENV}`)
    console.log(`   📊 Banco de dados: PostgreSQL apenas`)
  })
}

main().catch((err) => {
  console.error('❌ Erro ao iniciar servidor:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  if (cleanupInterval) clearInterval(cleanupInterval)
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (cleanupInterval) clearInterval(cleanupInterval)
  await prisma.$disconnect()
  process.exit(0)
})
