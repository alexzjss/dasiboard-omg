# ⚙️ Configuração de Variáveis de Ambiente - DigitalOcean

## 📌 Antes de Começar

Escolha sua configuração:

### **Opção 1: PostgreSQL + Redis** (Recomendado)
- ⚡ Performance melhor
- 🔄 Gerenciamento de tokens mais rápido
- 🎯 Escalável para >100k tokens

### **Opção 2: PostgreSQL Only** (Simplificado)
- 💰 Apenas 1 banco de dados
- 🟢 Suficiente para projetos pequenos/médios
- 📖 Guia: [POSTGRESQL_ONLY.md](POSTGRESQL_ONLY.md)

---

## Passo-a-Passo Visual

### 1️⃣ Acesse o Console

1. Abra [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Selecione seu app
3. Clique na aba **Settings**
4. Clique em **Environment** no menu lateral

### 2️⃣ Adicione Cada Variável

Para cada linha da tabela abaixo, clique em **+ Add Variable** e preencha:

---

## 📋 Tabela de Configuração

### Variáveis Obrigatórias

#### 1. DATABASE_URL
```
Key:     DATABASE_URL
Value:   postgresql://user:password@postgres-12345.db.ondigitalocean.com:25060/dasiboard_db?sslmode=require
Scope:   RUN_TIME
Encrypt: ✅ SIM
```
**Como obter:**
1. No DigitalOcean, crie um **Managed PostgreSQL Database** 15+
2. Copie a connection string da aba **Connection** → **Connection String**

#### 2. REDIS_URL *(Opcional - pule se usar PostgreSQL Only)*

```
Key:     REDIS_URL
Value:   rediss://:password@redis-12345.db.ondigitalocean.com:25061
Scope:   RUN_TIME
Encrypt: ✅ SIM
```

**Como obter:**
1. No DigitalOcean, crie **Managed Redis Database** (versão 7+)
   - *Ou pule esta variável se preferir usar PostgreSQL only*
2. Copie a connection string

**⚠️ IMPORTANTE:**
- Se NÃO vai usar Redis, continue sem adicionar esta variável
- Se vai usar, adicione ela agora
- Veja [POSTGRESQL_ONLY.md](POSTGRESQL_ONLY.md) para remover Redis permanentemente

#### 3. JWT_SECRET
```
Key:     JWT_SECRET
Value:   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6  (32 caracteres)
Scope:   RUN_AND_BUILD_TIME
Encrypt: ✅ SIM
```
**Como gerar:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Saída: abc123def456...
```
Cole o resultado no campo "Value"

#### 4. JWT_REFRESH_SECRET
```
Key:     JWT_REFRESH_SECRET
Value:   x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6  (32 caracteres diferentes)
Scope:   RUN_AND_BUILD_TIME
Encrypt: ✅ SIM
```
**Como gerar:** Use o mesmo comando acima e gere outro valor

---

### Variáveis Opcionais (mas recomendadas)

#### 5. NODE_ENV
```
Key:     NODE_ENV
Value:   production
Scope:   RUN_AND_BUILD_TIME
Encrypt: ❌ NÃO
```

#### 6. PORT
```
Key:     PORT
Value:   8080
Scope:   RUN_TIME
Encrypt: ❌ NÃO
```

#### 7. CORS_ORIGIN
```
Key:     CORS_ORIGIN
Value:   https://seu-dominio.com
Scope:   RUN_TIME
Encrypt: ❌ NÃO
```
(Ou deixe em branco para usar o padrão de desenvolvimento)

#### 8. DO_SPACES_KEY (se usar upload de arquivos)
```
Key:     DO_SPACES_KEY
Value:   sua-chave-spaces
Scope:   RUN_TIME
Encrypt: ✅ SIM
```

#### 9. DO_SPACES_SECRET (se usar upload de arquivos)
```
Key:     DO_SPACES_SECRET
Value:   seu-secret-spaces
Scope:   RUN_TIME
Encrypt: ✅ SIM
```

---

## ⏱️ Guia Rápido de Scope

| Scope | Recomendado Para | Exemplos |
|-------|------------------|----------|
| **RUN_AND_BUILD_TIME** | Variáveis que afetam a compilação | JWT_SECRET, JWT_REFRESH_SECRET, NODE_ENV |
| **RUN_TIME** | Variáveis que afetam apenas execução | DATABASE_URL, REDIS_URL, CORS_ORIGIN, PORT |

---

## 🔐 Guia de Encrypt

| Tipo de Valor | Encrypt | Por quê? |
|---------------|---------|---------|
| **Senhas** | ✅ SIM | DATABASE_URL contém senha |
| **Tokens** | ✅ SIM | JWT_SECRET é sensível |
| **Chaves privadas** | ✅ SIM | DO_SPACES_SECRET |
| **URLs públicas** | ❌ NÃO | CORS_ORIGIN é público |
| **Portas** | ❌ NÃO | PORT é técnico |
| **Ambiente** | ❌ NÃO | NODE_ENV é informação |

---

## ✅ Checklist Final

Antes de clicar em **Deploy**, verifique:

- [ ] ✅ DATABASE_URL adicionada e encriptada
- [ ] ✅ REDIS_URL adicionada e encriptada
- [ ] ✅ JWT_SECRET adicionada e encriptada
- [ ] ✅ JWT_REFRESH_SECRET adicionada e encriptada
- [ ] ✅ NODE_ENV = production
- [ ] ✅ PORT = 8080
- [ ] ✅ CORS_ORIGIN preenchida com seu domínio
- [ ] ✅ Nenhuma variável vazia ou com valores de exemplo

---

## 🚀 Depois de Configurado

1. Clique em **Save**
2. Clique em **Deploy**
3. Monitore os **Logs** enquanto a app inicia
4. Verifique se passa no **Health Check**

---

## 🔧 Troubleshooting

### Erro: "Health Check Failed"
**Provavelmente**: Uma das variáveis obrigatórias está errada
- Verifique DATABASE_URL
- Verifique REDIS_URL
- Veja os logs para mais detalhes

### Erro: "Build Failed"
**Provavelmente**: Problema durante build
- Execute localmente: `npm run build` para reproduzir
- Verifique se JWT_SECRET não está vazio

### Build sucesso mas app não inicia
**Provavelmente**: PORT não está 8080
- Verifique PORT = 8080 exatamente

### Acessar app mas erro 500
**Provavelmente**: Banco ou Redis indisponível
- Verifique DATABASE_URL
- Verifique REDIS_URL
- **Importante**: Se usar PostgreSQL Managed, adicione `?sslmode=require` no final da URL

---

## 📚 Referências

- [DigitalOcean - Environment Variables](https://docs.digitalocean.com/app-platform/how-to/use-environment-variables/)
- [Prisma - Connection String](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Redis - Connection URL](https://redis.io/docs/clients/java/jedis/)
