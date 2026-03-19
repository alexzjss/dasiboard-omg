#!/bin/bash

# ============================================================
# Validação de Variáveis de Ambiente
# ============================================================
# Este script valida se todas as variáveis obrigatórias estão configuradas
# Use: ./scripts/validate-env.sh

set -e

echo "🔍 Validando variáveis de ambiente..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis obrigatórias
REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
)

# Variáveis opcionais com valores padrão
OPTIONAL_VARS=(
  "NODE_ENV:development"
  "PORT:3000"
  "CORS_ORIGIN:http://localhost:5173"
  "DO_SPACES_BUCKET:dasiboard"
  "DO_SPACES_ENDPOINT:https://nyc3.digitaloceanspaces.com"
)

MISSING=0
FOUND=0

# Verifica variáveis obrigatórias
echo "📋 Variáveis Obrigatórias:"
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}  ✗ $var${NC} (não definida)"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}  ✓ $var${NC} (✓ definida)"
    FOUND=$((FOUND + 1))
  fi
done

echo ""
echo "📋 Variáveis Opcionais:"
for item in "${OPTIONAL_VARS[@]}"; do
  var="${item%:*}"
  default="${item#*:}"
  value="${!var:-$default}"
  echo -e "${GREEN}  ✓ $var${NC} = $value"
done

echo ""
if [ $MISSING -gt 0 ]; then
  echo -e "${RED}❌ Erro: $MISSING variável(is) obrigatória(s) não definida(s)${NC}"
  echo ""
  echo "Configure as variáveis faltantes:"
  for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      echo "  export $var=<seu-valor>"
    fi
  done
  exit 1
fi

echo -e "${GREEN}✅ Todas as variáveis obrigatórias estão configuradas!${NC}"
exit 0
