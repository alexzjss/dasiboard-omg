# DaSIboard 🎓

Dashboard acadêmico do curso de **Sistemas de Informação — EACH USP**.  
Kanban · Notas · Calendário · Perfil — tudo em um só lugar.

---

## Stack

| Camada   | Tecnologia                       |
|----------|----------------------------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend  | Python 3.11 + FastAPI + psycopg2 |
| Banco    | PostgreSQL 15 (schema em SQL puro) |
| Servidor | Nginx (reverse proxy + SPA)      |
| Deploy   | Docker Compose → DigitalOcean    |
| CI/CD    | GitHub Actions (push → deploy)   |

---

## Estrutura

```
dasiboard/
├── database/
│   └── init.sql          ← schema SQL puro, roda automaticamente
├── backend/              ← FastAPI
│   ├── app/
│   │   ├── api/routes/   ← auth, kanban, grades, events, users
│   │   ├── core/         ← config, segurança JWT
│   │   ├── db/           ← conexão psycopg2
│   │   └── schemas/      ← Pydantic schemas
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             ← React + Vite
│   ├── src/
│   │   ├── pages/        ← Login, Register, Dashboard, Kanban, Grades, Calendar, Profile
│   │   ├── components/   ← AppLayout (sidebar)
│   │   ├── store/        ← Zustand (auth)
│   │   └── utils/        ← axios client
│   └── Dockerfile
├── nginx/
│   └── nginx.conf        ← reverse proxy: /api → backend, / → frontend
├── docker-compose.yml
├── .env.example
└── .github/workflows/
    └── deploy.yml        ← CI/CD automático
```

---

## Deploy no DigitalOcean (passo a passo)

### 1. Crie o Droplet

- OS: **Ubuntu 22.04 LTS**
- Plano: **Basic — 2 vCPU / 4 GB RAM** (mín. recomendado)
- Adicione sua chave SSH pública

### 2. Configure o servidor (uma única vez)

```bash
# Conecte via SSH
ssh root@SEU_IP_DO_DROPLET

# Instale Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Crie o diretório do projeto
mkdir -p /opt/dasiboard
```

### 3. Clone o repositório no servidor

```bash
cd /opt/dasiboard
git clone https://github.com/SEU_USUARIO/dasiboard.git .
```

### 4. Crie o arquivo .env

```bash
cp .env.example .env
nano .env
```

Preencha **todos** os campos marcados com `TROQUE-POR-...`.  
Para gerar segredos:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Suba a aplicação

```bash
docker compose up -d --build
```

O PostgreSQL criará o banco automaticamente usando `database/init.sql` na primeira vez.

Verifique:
```bash
docker compose ps          # todos os containers devem estar "Up"
curl http://localhost/health  # deve retornar {"status":"ok"}
```

Acesse: **http://SEU_IP_DO_DROPLET**

### 6. Configure o CI/CD (opcional — deploy automático)

No GitHub: **Settings → Secrets → Actions → New repository secret**

| Secret       | Valor                          |
|--------------|--------------------------------|
| `DO_HOST`    | IP do Droplet                  |
| `DO_USER`    | `root`                         |
| `DO_SSH_KEY` | Conteúdo da chave privada SSH  |

A partir daí, todo `git push origin main` fará o deploy automaticamente.

---

## Desenvolvimento local

```bash
# 1. Clone e entre na pasta
git clone https://github.com/SEU_USUARIO/dasiboard.git
cd dasiboard

# 2. Crie o .env
cp .env.example .env
# Edite APP_ENV=development e ALLOWED_ORIGINS=http://localhost

# 3. Suba tudo
docker compose up --build

# Acesse: http://localhost
# API Docs: http://localhost/docs  (apenas APP_ENV=development)
```

---

## Banco de dados

O schema é criado automaticamente pelo PostgreSQL na primeira vez que o container sobe,  
lendo o arquivo `database/init.sql`. **Não é necessário nenhuma ferramenta adicional.**

Para inspecionar o banco manualmente:
```bash
docker compose exec db psql -U dasiboard dasiboard
```

---

## Licença

MIT © EACH USP — Sistemas de Informação
