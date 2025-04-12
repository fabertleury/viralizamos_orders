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

# Verificar arquivos disponíveis
echo "Arquivos disponíveis em /app:"
ls -la /app
echo "Arquivos disponíveis em /app/dist:"
ls -la /app/dist || echo "Pasta dist não encontrada ou vazia"
echo "Arquivos disponíveis em /app/dist/server.js:"
cat /app/dist/server.js | head -n 20 || echo "Arquivo server.js não encontrado ou vazio"

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

# Verificar se o servidor principal existe
if [ -f "/app/dist/server.js" ]; then
  echo "Tentando iniciar o servidor principal..."
  
  # Criar um arquivo de flag para verificar se o servidor iniciou corretamente
  rm -f /tmp/server_started
  
  # Executar o servidor principal em segundo plano
  NODE_ENV=production node /app/dist/server.js &
  SERVER_PID=$!
  
  # Esperar até 10 segundos para ver se o servidor inicia corretamente
  echo "Aguardando inicialização do servidor (10 segundos)..."
  sleep 10
  
  # Verificar se o servidor ainda está em execução
  if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Servidor principal iniciado com sucesso (PID: $SERVER_PID)"
    # Aguardar o servidor principal
    wait $SERVER_PID
  else
    echo "❌ Servidor principal falhou ao iniciar"
    echo "🔄 Iniciando servidor de fallback..."
    NODE_ENV=production node /app/dist/fallback-server.js
  fi
else
  echo "❌ Servidor principal não encontrado"
  echo "🔄 Iniciando servidor de fallback..."
  NODE_ENV=production node /app/dist/fallback-server.js
fi 