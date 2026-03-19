# 🔄 PostgreSQL Only - Alternativa sem Redis

## ✅ É Possível?

**SIM!** Redis é **opcional** neste projeto. Ele é usado apenas para armazenar refresh tokens de autenticação.

Alternativa: Usar a tabela **RefreshToken** do PostgreSQL que já existe no Prisma.

---

## 📊 Comparação

| Aspecto | Com Redis | PostgreSQL Only |
|--------|-----------|-----------------|
| **Complexidade** | Média | Baixa |
| **Performance** | ⚡ Mais rápido | 🟢 Suficiente |
| **Infra necessária** | Redis + Postgres | Apenas Postgres |
| **Custo** | 2 bancos | 1 banco |
| **Tokens expirados** | TTL automático | Limpeza periódica |
| **Escalabilidade** | >100k tokens | <100k tokens |

---

## 🔧 Como Remover Redis

### Passo 1: Atualizar `apps/api/src/utils/env.ts`

**De:**
```typescript
REDIS_URL: requireEnv('REDIS_URL'),
```

**Para:**
```typescript
REDIS_URL: optionalEnv('REDIS_URL', ''),  // Opcional
```

---

### Passo 2: Refatorar `apps/api/src/utils/redis.ts`

**Substitua o arquivo inteiro por:**

```typescript
import { prisma } from './prisma'

/**
 * Salva um refresh token no banco com expiração
 * @param userId ID do usuário
 * @param token Token JWT
 * @param ttlSeconds Tempo de vida em segundos (padrão: 7 dias)
 */
export async function setRefreshToken(
  userId: string,
  token: string,
  ttlSeconds: number = 7 * 24 * 60 * 60
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })
}

/**
 * Recupera e valida um refresh token
 * Retorna o userId se válido, null caso contrário
 */
export async function getRefreshToken(token: string): Promise<string | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
  })

  // Token não existe
  if (!record) return null

  // Token expirado
  if (record.expiresAt < new Date()) {
    await deleteRefreshToken(token)
    return null
  }

  return record.userId
}

/**
 * Deleta um refresh token específico (logout de um dispositivo)
 */
export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  })
}

/**
 * Deleta todos os refresh tokens de um usuário (logout de todos os dispositivos)
 */
export async function deleteAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })
}

/**
 * Limpa tokens expirados (executar periodicamente)
 * Recomendado: a cada 1 hora
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })
  
  return result.count
}
```

---

### Passo 3: Atualizar `apps/api/src/index.ts`

**Remova as linhas de Redis:**

```typescript
// ❌ REMOVA ISTO:
// import { redis } from './utils/redis'

// No início (remova):
// async function main() {
//   try {
//     await redis.ping()
//     console.log('✓ Redis conectado')
//   } catch (err) {
//     console.error('✗ Erro ao conectar Redis:', err)
//     process.exit(1)
//   }
// }

// No graceful shutdown (remova):
// redis.disconnect()
```

**Substitua por um job de limpeza:**

```typescript
import { cleanupExpiredTokens } from './utils/redis'

// ... código existente ...

// Iniciar job de limpeza de tokens a cada 1 hora
const cleanupInterval = setInterval(async () => {
  try {
    const deleted = await cleanupExpiredTokens()
    if (deleted > 0) {
      console.log(`🧹 Limpeza: ${deleted} refresh tokens expirados removidos`)
    }
  } catch (err) {
    console.error('❌ Erro na limpeza de tokens:', err)
  }
}, 60 * 60 * 1000) // 1 hora

// Parar job na desconexão
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval)
  // ... resto do shutdown ...
})
```

---

### Passo 4: Sem mudanças necessárias em:

✅ `apps/api/src/services/auth.service.ts` - Funciona igual
✅ `apps/api/src/routes/auth.ts` - Sem mudanças
✅ `apps/api/src/middlewares/` - Sem mudanças
✅ `apps/api/src/app.ts` - Sem mudanças

---

### Passo 5: Variáveis de Ambiente

**Remova REDIS_URL** da configuração do DigitalOcean:

Você só precisa de:
- ✅ `DATABASE_URL` - PostgreSQL
- ✅ `JWT_SECRET` - Chave JWT
- ✅ `JWT_REFRESH_SECRET` - Chave refresh
- ✅ `NODE_ENV` - Ambiente
- ✅ `PORT` - Porta
- ✅ `CORS_ORIGIN` - Domínio frontend

---

## 🧪 Teste Localmente

```bash
# 1. Atualize o arquivo redis.ts conforme acima
# 2. Atualize o index.ts

# 3. Teste a compilação
npm run build

# 4. Inicie o servidor (sem Redis)
npm run start

# 5. Teste o fluxo de autenticação
# - Faça login
# - Verifique se o token é salvo no banco
# - Faça refresh do token
# - Faça logout
```

---

## 📈 Performance e Escalabilidade

### ✅ **Quando usar PostgreSQL Only**:
- Projeto pequeno/médio
- <100k tokens simultâneos
- Infraestrutura simplificada
- Orçamento limitado (1 banco ao invés de 2)

### ⚠️ **Quando manter Redis**:
- >100k tokens simultâneos
- Aplicação de larga escala
- Necessidade de performance extrema
- Logout instantâneo é crítico

---

## 🔍 Detalhes Técnicos

### Tabela RefreshToken (já existe no Prisma)

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("refresh_tokens")
}
```

### Diferenças vs Redis

| Aspecto | Redis | PostgreSQL |
|--------|-------|-----------|
| **Armazenamento** | Memória | Disco |
| **Velocidade** | Microsegundos | Milissegundos |
| **Persistência** | Precisa config | Automática |
| **TTL** | Nativo | Manual |
| **Transações** | Limitadas | ACID completo |

---

## 🛠️ Troubleshooting

### Erro: "Refresh token não encontrado"
- Verifique se a tabela `refresh_tokens` foi criada
- Execute migrations: `pnpm db:migrate`

### Tokens antigos não deletam
- Job de limpeza corre a cada 1 hora
- Para deletar imediatamente, rode: `await cleanupExpiredTokens()`

### Performance lenta
- Adicione índice: `@@index([userId])` já existe
- Considere usar Redis se >100k tokens

---

## 📚 Referências

- [Prisma - Unique constraints](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [PostgreSQL - TTL com triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Node.js - setInterval e cleanup](https://nodejs.org/en/docs/guides/nodejs-cleanup-on-shutdown/)
