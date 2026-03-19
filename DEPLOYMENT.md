# Deployment no DigitalOcean

## Variáveis de Ambiente Obrigatórias

Antes de fazer o deploy no DigitalOcean, você precisa configurar as seguintes variáveis de ambiente:

### 1. **DATABASE_URL** (Obrigatório)
- **O quê:** URL de conexão com o banco de dados PostgreSQL
- **Exemplo:** `postgresql://user:password@host:5432/dasiboard_db`
- **Como obter:** Use um banco PostgreSQL no DigitalOcean ou Managed Database

### 2. **REDIS_URL** (Obrigatório)
- **O quê:** URL de conexão com Redis (cache e sessions)
- **Exemplo:** `redis://default:password@host:6379`
- **Como obter:** Use o Redis gerenciado do DigitalOcean ou sua própria instância

### 3. **JWT_SECRET** (Obrigatório)
- **O quê:** Chave secreta para assinar JWT tokens
- **Como gerar:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 4. **JWT_REFRESH_SECRET** (Obrigatório)
- **O quê:** Chave secreta para refresh tokens
- **Como gerar:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## Como Configurar no DigitalOcean App Platform

### Via Console Web (Recomendado para começar):

1. Abra seu app no [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Clique na aba **Settings** → **Environment**
3. Clique em **Edit & Deploy**
4. Adicione cada variável de ambiente:
   - Clique em **+ Add Variable**
   - Insira o **Name** (ex: `DATABASE_URL`)
   - Insira o **Value**
   - Clique em **Save**

### Via app.yaml (Arquivo de Configuração):

Se você gerencia a configuração via arquivo, edite o `app.yaml`:

```yaml
envs:
  - key: DATABASE_URL
    value: postgresql://user:password@host:5432/dasiboard_db
  - key: REDIS_URL
    value: redis://default:password@host:6379
  - key: JWT_SECRET
    value: your-generated-secret-key-here
  - key: JWT_REFRESH_SECRET
    value: your-generated-refresh-secret-here
  - key: CORS_ORIGIN
    value: https://seu-dominio.com
  - key: NODE_ENV
    value: production
```

## Passos Completos para Deploy

1. **Certifique-se de que todas as variáveis obrigatórias estão configuradas**
   - DATABASE_URL ✓
   - REDIS_URL ✓
   - JWT_SECRET ✓
   - JWT_REFRESH_SECRET ✓

2. **Faça o commit do arquivo `.env.example`:**
   ```bash
   git add apps/api/.env.example
   git commit -m "docs: add environment variables example"
   git push origin main
   ```

3. **Trigger um novo deploy no DigitalOcean**
   - Após configurar as variáveis, clique em **Deploy**

## Troubleshooting

### Erro: "Variável de ambiente obrigatória não definida: DATABASE_URL"
- ✓ Verifique se a variável foi adicionada corretamente
- ✓ Verifique o nome exato (sensível a minúsculas/maiúsculas)
- ✓ Aguarde a aplicação reiniciar após adicionar/modificar variáveis

### Erro de conexão: "ECONNREFUSED"
- ✓ DATABASE_URL ou REDIS_URL pode estar incorreta
- ✓ Verifique se o banco/Redis está online
- ✓ Verifique se a conexão/firewall permite acesso

### App inicia mas falha em breve
- ✓ Pode ser um erro de timeout na conexão do banco
- ✓ Verifique os logs: **Logs** tab no console
- ✓ Aumente o timeout se necessário

## Ambiente de Produção

Para produção, considere:

1. **Usar DigitalOcean Managed PostgreSQL**: Mais seguro e gerenciado
2. **Usar DigitalOcean Redis**: Cache gerenciado
3. **Gerar secrets fortes**: Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Habilitar HTTPS**: DigitalOcean fornece SSL gratuitamente
5. **Configurar backups**: Banco de dados automático

## Referências

- [DigitalOcean App Platform - Environment Variables](https://docs.digitalocean.com/app-platform/how-to/use-environment-variables/)
- [Configuração de Variáveis do Projeto](apps/api/.env.example)
