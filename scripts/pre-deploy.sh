#!/bin/bash

# ============================================================
# Pre-Deploy Checklist
# ============================================================
# Verifica se o projeto está pronto para deploy ao DigitalOcean

set -e

echo "🔍 Executando Pre-Deploy Checklist..."
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Função para verificar
check() {
  local name=$1
  local command=$2
  
  if eval "$command" &> /dev/null; then
    echo "✅ $name"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo "❌ $name"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
}

# Verifica git
echo "📋 Git & Repositório:"
check "Git repository" "git rev-parse --git-dir"
check "Nenhuma mudança não-commitada" "[ -z \"\$(git status --porcelain)\" ]"
check "Branch é main" "[ \"\$(git rev-parse --abbrev-ref HEAD)\" = \"main\" ]"
check "pnpm-lock.yaml commitado" "git ls-files | grep -q pnpm-lock.yaml"
check "Procfile existe" "[ -f Procfile ]"

echo ""
echo "📦 Dependências:"
check "package.json existe" "[ -f package.json ]"
check "pnpm-workspace.yaml existe" "[ -f pnpm-workspace.yaml ]"
check "apps/api/package.json existe" "[ -f apps/api/package.json ]"
check "apps/web/package.json existe" "[ -f apps/web/package.json ]"

echo ""
echo "🔧 Build:"
check "Build da API compila" "[ -d apps/api/dist ]"
check "dist/index.js foi gerado" "[ -f apps/api/dist/index.js ]"
check "tsconfig.json da API existe" "[ -f apps/api/tsconfig.json ]"

echo ""
echo "🗄️  Banco de Dados:"
check "Prisma schema existe" "[ -f apps/api/prisma/schema.prisma ]"

echo ""
echo "🔐 Configuração:"
check ".env.example documenta variáveis" "[ -f apps/api/.env.example ]"
check "DEPLOYMENT.md com instruções" "[ -f DEPLOYMENT.md ] && grep -q DATABASE_URL DEPLOYMENT.md"
check "app.yaml para DigitalOcean" "[ -f app.yaml ]"

echo ""
echo "📄 Arquivos importantes:"
check "README.md existe" "[ -f README.md ]"
check ".gitignore não vazio" "[ -s .gitignore ]"
check "Sem 'dist/' no versionamento" "! git ls-files | grep -q '^apps/api/dist/'"
check "Sem '.env' commitado" "! git ls-files | grep -E '^\\.env$|^\\.env\\.[a-z]' || true"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "✅ Todos os checks passaram! Projeto está pronto para deploy."
  echo ""
  echo "📝 Próximas ações no DigitalOcean:"
  echo ""
  echo "1. Acesse: https://cloud.digitalocean.com/apps"
  echo "2. Crie um novo app ou edite o existente"
  echo "3. Configure as variáveis de ambiente:"
  echo "   - DATABASE_URL (PostgreSQL Managed DB)"
  echo "   - REDIS_URL (Redis Managed DB)"
  echo "   - JWT_SECRET (32 caracteres aleatórios)"
  echo "   - JWT_REFRESH_SECRET (32 caracteres aleatórios)"
  echo ""
  echo "4. Deploy"
  echo ""
  exit 0
else
  echo "❌ $CHECKS_FAILED check(s) falharam!"
  echo ""
  echo "Corrija os problemas acima antes de fazer o deploy."
  exit 1
fi
