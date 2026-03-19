# DaSIboard v2

Dashboard acadêmico para o curso de Sistemas de Informação — USP/EACH.
Reconstruído como aplicação web full-stack com backend próprio, banco de dados e sincronização em nuvem.

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Frontend     | React 18 + TypeScript + Vite        |
| Estado       | Zustand + TanStack Query            |
| Backend      | Node.js 20 + Express + TypeScript   |
| ORM          | Prisma                              |
| Banco        | PostgreSQL 15                       |
| Cache/Auth   | Redis                               |
| Arquivos     | DigitalOcean Spaces                 |
| Hospedagem   | DigitalOcean App Platform           |
| CI/CD        | GitHub Actions                      |

## Estrutura

```
dasiboard-v2/
├── apps/
│   ├── api/          # Backend Node.js + Express
│   │   ├── prisma/   # Schema e migrations
│   │   └── src/      # Routes, controllers, services, middlewares
│   └── web/          # Frontend React
│       └── src/      # Pages, components, stores, api hooks
├── docker-compose.yml  # Dev local (postgres + redis)
└── .github/workflows/  # CI/CD
```

## Desenvolvimento local

### Pré-requisitos
- Node.js 20+
- pnpm 8+
- Docker + Docker Compose

### Setup

```bash
# 1. Clone e instale dependências
git clone https://github.com/seu-usuario/dasiboard-v2
cd dasiboard-v2
pnpm install

# 2. Suba o banco e o Redis
docker compose up -d

# 3. Configure o ambiente da API
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env se necessário (as defaults funcionam com o docker-compose)

# 4. Rode as migrations e o seed
pnpm db:migrate
pnpm db:seed

# 5. Inicie o monorepo
pnpm dev
```

A API estará em `http://localhost:3000` e o frontend em `http://localhost:5173`.

**Conta admin padrão (seed):** `admin@dasiboard.local` / `admin123`

### Comandos úteis

```bash
pnpm dev              # Inicia API + Web em paralelo
pnpm db:migrate       # Roda migrations pendentes
pnpm db:generate      # Regenera o Prisma client após mudar o schema
pnpm db:studio        # Abre o Prisma Studio (GUI do banco)
pnpm db:seed          # Popula o banco com dados iniciais
pnpm build            # Build de produção de todos os apps
```

## Módulos

| Módulo       | Rota frontend  | API                    | Auth exigida |
|--------------|----------------|------------------------|--------------|
| Home         | `/`            | —                      | Não          |
| Calendário   | `/calendar`    | `GET /api/events`      | Não          |
| Horários     | `/schedule`    | `GET /api/schedule`    | Não          |
| Kanban       | `/kanban`      | `/api/kanban`          | **Sim**      |
| Newsletter   | `/newsletter`  | `GET /api/newsletter`  | Não          |
| Docentes     | `/docentes`    | `GET /api/docentes`    | Não          |
| Estudos      | `/estudos`     | `GET /api/estudos`     | Não          |
| Notas & GPA  | `/notas-gpa`   | `/api/gpa`             | **Sim**      |
| Faltas       | `/faltas`      | `/api/faltas`          | **Sim**      |
| Entidades    | `/entidades`   | `GET /api/entidades`   | Não          |
| Ferramentas  | `/ferramentas` | —                      | Não          |
| Desafios     | `/desafios`    | `/api/challenges`      | Parcial      |
| Perfil       | `/profile`     | `PATCH /api/auth/me`   | **Sim**      |

## Deploy (DigitalOcean)

### Secrets necessários no GitHub

```
DO_ACCESS_TOKEN      # Token da API do DigitalOcean
DO_REGISTRY_NAME     # Nome do Container Registry (ex: dasiboard)
DO_APP_ID            # ID do App no App Platform
VITE_API_URL         # URL da API em produção (ex: https://api.dasiboard.com.br)
```

### Variáveis de ambiente em produção (App Platform)

```
DATABASE_URL         # Connection string do Managed PostgreSQL
REDIS_URL            # Connection string do Managed Redis
JWT_SECRET           # Segredo longo e aleatório
JWT_REFRESH_SECRET   # Outro segredo longo e aleatório
CORS_ORIGIN          # URL do frontend em produção
DO_SPACES_KEY        # Chave de acesso do Spaces
DO_SPACES_SECRET     # Segredo do Spaces
DO_SPACES_BUCKET     # Nome do bucket
NODE_ENV             # production
```

## Roles e permissões

| Role        | Descrição                                              |
|-------------|--------------------------------------------------------|
| `USER`      | Acesso padrão — Kanban, GPA, Faltas, Desafios pessoais |
| `MODERATOR` | USER + aprovar eventos, publicar newsletter/estudos    |
| `ADMIN`     | Tudo — gerenciar qualquer dado do sistema              |

## Versão

- v2.0.0 — Reconstrução full-stack a partir do DaSIboard v0.6.0 (HTML/CSS/JS estático)
