#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Verificar ambiente 
echo "📋 Verificando ambiente:"
echo "- Diretório atual: $(pwd)"
echo "- Arquivos no diretório: $(ls -la)"

# Verificar arquivos de configuração
echo "- Arquivos de configuração:"
if [ -f .env ]; then
  echo "  ✅ Arquivo .env encontrado"
else
  echo "  Nenhum arquivo .env encontrado"
fi

# Verificar variáveis de ambiente importantes
echo "🌐 Configurações de ambiente:"
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "SUPABASE_URL: ${SUPABASE_URL}"

# Aplicar correções no banco de dados (se o script existir)
if [ -f "prisma-db-fix.js" ]; then
  echo "🔄 Aplicando correções no banco de dados..."
  node prisma-db-fix.js || echo "⚠️ Erro ao executar o script de correção, mas continuando..."
fi

# Iniciar servidor
echo "🚀 Iniciando servidor..."
if [ -f "complete-server.js" ]; then
  echo "Usando complete-server.js"
  exec node complete-server.js
else
  echo "⚠️ complete-server.js não encontrado, tentando alternativas..."
  if [ -f "server.js" ]; then
    echo "Usando server.js"
    exec node server.js
  else
    echo "❌ Nenhum servidor encontrado. Iniciando servidor básico de emergência..."
    exec node -e 'const http = require("http"); const PORT = process.env.PORT || 4000; const server = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok", message: "Emergency server running" })); }); server.listen(PORT, () => console.log("Emergency server running on port "+PORT));'
  fi
fi 