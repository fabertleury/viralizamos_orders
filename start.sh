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

# Verificar arquivos disponíveis
echo "Arquivos disponíveis em /app:"
ls -la /app
echo "Arquivos disponíveis em /app/dist:"
ls -la /app/dist || echo "Pasta dist não encontrada ou vazia"
echo "Arquivos disponíveis em /app/dist/server.js:"
cat /app/dist/server.js | head -n 20 || echo "Arquivo server.js não encontrado ou vazio"

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

# Iniciar o servidor
echo "Iniciando servidor principal..."
NODE_ENV=production node /app/dist/server.js 