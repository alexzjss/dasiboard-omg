#!/bin/bash
# DaSIboard v2 — Setup script
set -e

echo "🚀 DaSIboard v2 — Setup"
echo ""

# Create .env from example if it doesn't exist
if [ ! -f apps/api/.env ]; then
    if [ -f apps/api/.env.example ]; then
        cp apps/api/.env.example apps/api/.env
        echo "✅ Criado apps/api/.env"
    else
        # Create directly if .env.example also missing (Windows extraction issue)
        cat > apps/api/.env << 'ENVEOF'
# Database
DATABASE_URL="postgresql://dasiboard:dasiboard_dev@localhost:5432/dasiboard"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="troque-para-um-segredo-muito-longo-e-aleatorio"
JWT_REFRESH_SECRET="troque-para-outro-segredo-muito-longo-e-aleatorio"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

# DigitalOcean Spaces (opcional em dev)
DO_SPACES_KEY=""
DO_SPACES_SECRET=""
DO_SPACES_BUCKET="dasiboard"
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_CDN_ENDPOINT="https://dasiboard.nyc3.cdn.digitaloceanspaces.com"
ENVEOF
        echo "✅ Criado apps/api/.env (direto)"
    fi
else
    echo "✅ apps/api/.env já existe"
fi

echo ""
echo "Próximos passos:"
echo "  1. docker compose up -d"
echo "  2. pnpm install"
echo "  3. pnpm db:migrate"
echo "  4. pnpm db:seed"
echo "  5. pnpm dev"
