#!/bin/bash

# ============================================================
# Setup Inicial - DaSIboard v2
# ============================================================
# Este script configura o ambiente local para desenvolvimento
# Use: ./scripts/setup.sh

set -e

echo "🚀 Iniciando setup do DaSIboard v2..."
echo ""

# Verifica pré-requisitos
echo "✓ Verificando dependências..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado. Instale Node.js 20+"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm não encontrado. Instale com: npm install -g pnpm"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker não encontrado. Docker é opcional mas recomendado para Redis/Postgres"
fi

echo "✓ Node.js $(node -v)"
echo "✓ pnpm $(pnpm -v)"
echo ""

# Instala dependências
echo "📦 Instalando dependências..."
pnpm install

echo ""
echo "🏗️  Compilando projeto..."
pnpm build

echo ""
echo "🔧 Configurando variáveis de ambiente..."

# Cria arquivo .env.local se não existir
if [ ! -f apps/api/.env.local ]; then
  echo "Criando apps/api/.env.local com variáveis de desenvolvimento..."
  cat > apps/api/.env.local << 'EOF'
# Desenvolvimento Local
NODE_ENV=development
PORT=3000

# PostgreSQL (Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dasiboard_dev

# Redis (Docker Compose)
REDIS_URL=redis://localhost:6379

# JWT (gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=dev_secret_key_change_in_production_12345678901234567890
JWT_REFRESH_SECRET=dev_refresh_key_change_in_production_12345678901234567890

# Frontend URL
CORS_ORIGIN=http://localhost:5173
EOF
  echo "✓ apps/api/.env.local criado"
else
  echo "✓ apps/api/.env.local já existe"
fi

echo ""
echo "🐳 Iniciando serviços com Docker Compose..."

if command -v docker &> /dev/null; then
  docker compose up -d
  echo "✓ PostgreSQL e Redis iniciados"
  sleep 2
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Aplicar migrations do Prisma:"
echo "   pnpm db:migrate"
echo ""
echo "2. Iniciar servidor de desenvolvimento:"
echo "   pnpm dev"
echo ""
echo "3. Abra no navegador:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend: http://localhost:3000"
echo ""
echo "📚 Para mais informações:"
echo "   • Backend: apps/api/README.md"
echo "   • Frontend: apps/web/README.md"
echo "   • Deploy: DEPLOYMENT.md"
