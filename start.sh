#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Garantir que o Prisma é gerado antes de iniciar a aplicação
echo "Gerando cliente Prisma..."
npx prisma generate

# Diretório para arquivos estáticos
cd /app
mkdir -p public

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > public/health.json

# Iniciar servidor de healthcheck independente em background
node dist/standalone-health.js &
HEALTH_PID=$!

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "HEALTH_PID: $HEALTH_PID"

# Dar alguns segundos para o healthcheck server iniciar
sleep 3

# Executar o servidor principal
exec node dist/server.js 