# 🔄 Migração para PostgreSQL Only

**Data:** 19 de março de 2026  
**Versão:** 1.0.0  

## 📋 O que Mudou?

O projeto foi refatorado para usar apenas **PostgreSQL** em vez de PostgreSQL + Redis.

### ✅ Removido
- Package: `ioredis` (dependência removida de `apps/api/package.json`)
- Arquivo: Redis initialization removido de `apps/api/src/index.ts`
- Variável: `REDIS_URL` agora é opcional (ou não necessária)

### ✨ Implementado
- Refresh tokens armazenados na tabela `RefreshToken` do Prisma
- Job automático de limpeza de tokens expirados (a cada 1 hora)
- Suporte a graceful shutdown do job de limpeza

### 🔄 Mantido Compatível
- Todas as funções em `apps/api/src/utils/redis.ts` ainda existem com a mesma interface
- Serviços de autenticação funcionam idênticos
- Fluxo de login/logout não mudou

---

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Banco de dados | PostgreSQL + Redis | PostgreSQL |
| Custo | 2 bancos gerenciados | 1 banco gerenciado |
| Infra | Mais complexa | Simplificada |
| Performance | ⚡ Muito rápida | ✅ Rápida o suficiente |
| Escalabilidade | >100k tokens | <100k tokens |
| Limpeza de tokens | TTL automático do Redis | Job periódico (1 hora) |

---

## 🔧 Mudanças Técnicas

### 1. Arquivo: `apps/api/src/utils/redis.ts`

**Antes (Redis):**
```typescript
import { Redis } from 'ioredis'
export const redis = new Redis(env.REDIS_URL, {...})
export async function setRefreshToken(userId: string, token: string, ttlSeconds: number) {
  await redis.setex(`refresh:${token}`, ttlSeconds, userId)
}
```

**Depois (PostgreSQL):**
```typescript
import { prisma } from './prisma'
export async function setRefreshToken(userId: string, token: string, ttlSeconds: number) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt }
  })
}
```

### 2. Arquivo: `apps/api/src/index.ts`

**Antes (com Redis):**
```typescript
import { redis } from './utils/redis'
async function main() {
  await redis.ping()
  console.log('✓ Redis conectado')
}
```

**Depois (com Job):**
```typescript
import { cleanupExpiredTokens } from './utils/redis'
async function main() {
  const cleanupInterval = setInterval(async () => {
    const deleted = await cleanupExpiredTokens()
    if (deleted > 0) console.log(`🧹 Deletados: ${deleted} tokens`)
  }, 60 * 60 * 1000) // 1 hora
}
```

### 3. Arquivo: `apps/api/src/utils/env.ts`

```typescript
// Antes
REDIS_URL: requireEnv('REDIS_URL'),

// Depois
REDIS_URL: optionalEnv('REDIS_URL', ''), // Não necessário mais
```

### 4. Arquivo: `apps/api/package.json`

```json
// Antes
"ioredis": "^5.3.2",

// Depois
// Removido - não existe mais
```

### 5. Arquivo: `app.yaml`

```yaml
# Antes
envs:
  - key: REDIS_URL
    value: ${redis.connection_string}
databases:
  - name: redis
    version: "7"

# Depois
# REDIS_URL removido
# databases.redis removido
```

---

## ✅ Checklist de Verificação

### Desenvolvimento Local

```bash
# 1. Atualizar dependências
rm -rf node_modules/ pnpm-lock.yaml
pnpm install

# 2. Compilar
npm run build

# 3. Verificar sem erros
# ✓ Gerando Prisma Client
# ✓ TypeScript compila sem erro
# ✓ dist/ gerado

# 4. (Opcional) Testar localmente
npm run start
# ✓ PostgreSQL conectado
# ✓ Job de limpeza iniciado
# ✓ API rodando em http://localhost:3000
```

### DigitalOcean Deploy

```
✅ Remover REDIS_URL das variáveis de ambiente
✅ Manter apenas DATABASE_URL configurada
✅ Adicionar JWT_SECRET e JWT_REFRESH_SECRET
✅ Trigger novo Deploy
✅ Verificar Health Check passar
✅ Testar login/logout no app
```

---

## 🚀 Próximos Passos

### Para novos deploys:

1. **Variáveis de Ambiente:**
   - DATABASE_URL ✅
   - JWT_SECRET ✅
   - JWT_REFRESH_SECRET ✅
   - NODE_ENV = production ✅
   - PORT = 8080 ✅
   - CORS_ORIGIN = seu-dominio.com ✅

2. **Recursos DigitalOcean:**
   - ✅ PostgreSQL Managed Database (v15+)
   - ❌ Redis NÃO necessário

3. **Verificação:**
   - ✅ Deploy completa sem erros
   - ✅ Health Check passa
   - ✅ Login funciona
   - ✅ Tokens persistem

---

## 🔍 Monitoramento

### Logs para observar:

```
✓ PostgreSQL conectado       <- Sempre deve aparecer
🧹 Limpeza: N tokens       <- Aparece a cada 1 hora (ou quando houver tokens expirados)
🚀 API rodando em...        <- Servidor iniciado com sucesso
```

### Se algo der erro:

- **"Variável obrigatória não definida: DATABASE_URL"**
  - Verificar DATABASE_URL no DigitalOcean UI

- **"Cannot find module 'redis'"**
  - Verificar se `pnpm install` rodou corretamente
  - Resetar lock files: `rm pnpm-lock.yaml && pnpm install`

- **Health Check falha**
  - Verificar logs: DigitalOcean App → Logs
  - Garantir que está rodando em PORT 8080

---

## 📚 Referências

- [Migração completa: POSTGRESQL_ONLY.md](POSTGRESQL_ONLY.md)
- [Guia de ambiente: ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- [Instruções de deploy: DEPLOYMENT.md](DEPLOYMENT.md)

---

## ❓ FAQ

**P: Por qual motivo removeu Redis?**  
R: Redis era usado apenas para tokens, e a tabela RefreshToken do Prisma é suficiente para <100k tokens. Isso simplifica a infraestrutura.

**P: Vai perder performance?**  
R: PostgreSQL é suficientemente rápido para a maioria dos casos. Redis era uma otimização que tem custo.

**P: E se tiver >100k tokens simultâneos?**  
R: Nesse caso, seria melhor trazer Redis de volta. O código é compatível com ambas as abordagens.

**P: Como volta para PostgreSQL + Redis?**  
R: O histórico Git está preservado. Pode fazer revert ou olhar o branch anterior.

**P: Os dados de token vão ser perdidos?**  
R: Não. A tabela RefreshToken já existe no banco. Os tokens continuam persistidos.

---

## 🎯 Status

- ✅ Código refatorado
- ✅ Dependências atualizadas
- ✅ Testes de compilação passando
- ✅ Deploy pronto
- ✅ Documentação atualizada

**Próximo passo:** Configure o banco PostgreSQL no DigitalOcean e faça deploy!
