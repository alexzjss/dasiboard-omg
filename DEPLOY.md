# Deploy — DaSIboard v2

Guia passo a passo para enviar ao GitHub e hospedar no DigitalOcean App Platform.

---

## 1. Enviar para o GitHub

```bash
# Na raiz do projeto (dasiboard-v2/)
git init
git add .
git commit -m "feat: initial commit — DaSIboard v2"

# Crie um repositório no GitHub (github.com/new) e depois:
git remote add origin https://github.com/SEU-USUARIO/dasiboard-v2.git
git branch -M main
git push -u origin main
```

---

## 2. Configurar Secrets no GitHub

Acesse: **Repositório → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|--------|-------|
| `DO_ACCESS_TOKEN` | Token da API do DigitalOcean (veja passo 3) |
| `DO_REGISTRY_NAME` | Nome do Container Registry (ex: `dasiboard`) |
| `DO_APP_ID` | ID do App no App Platform (obtido no passo 4) |
| `VITE_API_URL` | URL da API em produção (ex: `https://api.dasiboard.com.br`) |

---

## 3. Criar Token no DigitalOcean

1. Acesse: https://cloud.digitalocean.com/account/api/tokens
2. Clique em **Generate New Token**
3. Nome: `dasiboard-github-actions`
4. Escopo: **Read + Write**
5. Copie o token → coloque em `DO_ACCESS_TOKEN` no GitHub

---

## 4. Criar Container Registry no DigitalOcean

```bash
# Instale o doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init  # Cole o DO_ACCESS_TOKEN quando pedido

doctl registry create dasiboard --region nyc3
```

O nome `dasiboard` vai para `DO_REGISTRY_NAME`.

---

## 5. Criar o App no DigitalOcean App Platform

### Opção A — Via painel (mais fácil)

1. Acesse: https://cloud.digitalocean.com/apps
2. Clique em **Create App → From Source Code → GitHub**
3. Autorize e selecione o repositório `dasiboard-v2`, branch `main`
4. Clique em **Edit your app spec** e cole o conteúdo de `.do/app.yaml`
5. Substitua `seu-usuario/dasiboard-v2` pelo seu repositório real
6. Configure os secrets de ambiente (veja seção abaixo)
7. Clique em **Create Resources**

### Opção B — Via CLI

```bash
# Edite .do/app.yaml substituindo "seu-usuario" pelo seu usuário real
doctl apps create --spec .do/app.yaml
```

Após criar, anote o **App ID** para o secret `DO_APP_ID`:

```bash
doctl apps list
```

---

## 6. Configurar Variáveis de Ambiente no App Platform

No painel do App → **Settings → Environment Variables**:

**Serviço `api`:**

| Variável | Tipo | Valor |
|----------|------|-------|
| `DATABASE_URL` | Secret | Connection string do Managed PostgreSQL |
| `REDIS_URL` | Secret | Connection string do Managed Redis |
| `JWT_SECRET` | Secret | Gere com: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Secret | Gere outro valor diferente do anterior |
| `JWT_ACCESS_EXPIRES_IN` | Plain | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Plain | `7d` |
| `CORS_ORIGIN` | Plain | URL do frontend (ex: `https://dasiboard.ondigitalocean.app`) |
| `NODE_ENV` | Plain | `production` |
| `PORT` | Plain | `3000` |
| `DO_SPACES_KEY` | Secret | Chave do DO Spaces (se usar uploads) |
| `DO_SPACES_SECRET` | Secret | Secret do DO Spaces |

**Serviço `web`:**

| Variável | Tipo | Valor |
|----------|------|-------|
| `VITE_API_URL` | Build-time | URL da API (ex: `https://dasiboard-api.ondigitalocean.app`) |

---

## 7. Rodar Migrations em Produção

Após o primeiro deploy, rode as migrations via run command temporário ou pelo console do App Platform:

```bash
doctl apps console <APP_ID> --component api
# Dentro do container:
npx prisma migrate deploy
```

Ou configure um **Job** no `app.yaml`:

```yaml
jobs:
  - name: migrate
    kind: PRE_DEPLOY
    run_command: npx prisma migrate deploy
    source_dir: apps/api
```

---

## 8. Verificar o Deploy

```bash
# Acompanhar deployments
doctl apps list-deployments <APP_ID>

# Ver logs
doctl apps logs <APP_ID> --component api --follow
doctl apps logs <APP_ID> --component web --follow
```

A URL pública aparece em: **App Platform → seu app → Live URL**

---

## Desenvolvimento Local (recapitulando)

```bash
# Pré-requisitos: Node 20+, pnpm 8+, Docker

git clone https://github.com/SEU-USUARIO/dasiboard-v2.git
cd dasiboard-v2

pnpm install              # instala todas as dependências do monorepo
docker compose up -d      # sobe PostgreSQL + Redis localmente
pnpm db:migrate           # aplica as migrations
pnpm db:seed              # popula dados iniciais
pnpm dev                  # inicia API (porta 3000) + Web (porta 5173)
```

**Conta admin padrão:** `admin@dasiboard.local` / `admin123`
