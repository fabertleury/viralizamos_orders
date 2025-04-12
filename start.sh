#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Install cross-env if it's not available
if ! command -v cross-env >/dev/null 2>&1; then
  echo "Installing cross-env..."
  npm install -g cross-env
  npm install --save cross-env
fi

# Garantir que as pastas necessárias existam
mkdir -p /app/dist/prisma
mkdir -p /app/public

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "REDIS_URL: ${REDIS_URL:-não definido}"
echo "DATABASE_URL: ${DATABASE_URL:-não definido}"

# Verificar a presença do esquema Prisma
if [ -f "/app/prisma/schema.prisma" ]; then
  echo "Esquema Prisma encontrado. Gerando cliente..."
  npx prisma generate
else
  echo "AVISO: Esquema Prisma não encontrado em /app/prisma/schema.prisma"
fi

# Executar script para corrigir o banco de dados
echo "🔧 Executando script de correção do banco de dados..."
if [ -f "/app/scripts/fix-database.js" ]; then
  NODE_ENV=production node /app/scripts/fix-database.js
  echo "✅ Script de correção do banco de dados concluído"
else
  echo "⚠️ Script de correção do banco de dados não encontrado em /app/scripts/fix-database.js"
fi

# Verificar arquivos disponíveis
echo "Arquivos disponíveis em /app:"
ls -la /app
echo "Arquivos disponíveis em /app/dist:"
ls -la /app/dist || echo "Pasta dist não encontrada ou vazia"
echo "Arquivos disponíveis em /app/dist/server.js:"
cat /app/dist/server.js | head -n 20 || echo "Arquivo server.js não encontrado ou vazio"

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

# Iniciar servidor fallback com suporte completo
echo "🚀 Iniciando servidor fallback com suporte a orders e GraphQL..."
NODE_ENV=production node /app/dist/fallback-server.js 