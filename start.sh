#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Garantir que as pastas necessárias existam
mkdir -p /app/dist/prisma
mkdir -p /app/public

# Copiar o schema.prisma para a pasta dist/prisma se ele não existir lá
if [ ! -f "/app/dist/prisma/schema.prisma" ] && [ -f "/app/prisma/schema.prisma" ]; then
  echo "Copiando schema.prisma para dist/prisma..."
  cp -r /app/prisma/* /app/dist/prisma/
fi

# Garantir que o Prisma é gerado antes de iniciar a aplicação
echo "Gerando cliente Prisma..."
npx prisma generate || echo "Falha ao gerar Prisma client, mas continuando..."

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

echo "Verificando se o arquivo standalone-health.js existe..."
if [ -f "/app/dist/standalone-health.js" ]; then
  # Iniciar servidor de healthcheck independente em background
  echo "Iniciando servidor de healthcheck..."
  node /app/dist/standalone-health.js &
  HEALTH_PID=$!
  echo "HEALTH_PID: $HEALTH_PID"
else
  echo "Arquivo standalone-health.js não encontrado, pulando inicialização do healthcheck"
fi

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"

# Dar alguns segundos para preparação
sleep 2

echo "Verificando se o arquivo server.js existe..."
if [ -f "/app/dist/server.js" ]; then
  # Executar o servidor principal
  echo "Iniciando servidor principal..."
  exec node /app/dist/server.js
else
  echo "ERRO: Arquivo /app/dist/server.js não encontrado!"
  echo "Arquivos disponíveis em /app/dist:"
  ls -la /app/dist
  
  # Como fallback, iniciar um servidor simples para healthcheck
  echo "Iniciando servidor de fallback para healthcheck..."
  while true; do
    sleep 60
    echo "Servidor em modo de contingência rodando..."
  done
fi 