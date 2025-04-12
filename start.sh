#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL: ${DATABASE_URL:-não definido}"

# Iniciar o servidor HTTP básico
echo "🚀 Iniciando servidor básico..."
NODE_ENV=production exec node /app/basic-server.js 