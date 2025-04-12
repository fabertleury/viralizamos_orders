#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Garantir que as pastas necessárias existam
mkdir -p /app/dist/prisma
mkdir -p /app/public

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL: ${DATABASE_URL:-não definido}"
echo "REDIS_URL: ${REDIS_URL:-não definido}"

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

# Executar script para corrigir o banco de dados
echo "🔧 Executando script de correção do banco de dados..."
if [ -f "/app/scripts/run-database-fix.js" ]; then
  NODE_ENV=production node /app/scripts/run-database-fix.js
  echo "✅ Script de correção do banco de dados concluído"
else
  echo "⚠️ Script de correção do banco de dados não encontrado!"
fi

# Tentar iniciar o servidor principal
echo "🚀 Iniciando o serviço Viralizamos Orders..."

# Usar o script de bootstrap para gerenciar o fallback
NODE_ENV=production exec node /app/dist/bootstrap.js 