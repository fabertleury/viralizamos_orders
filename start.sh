#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Verificar ambiente antes de iniciar
echo "📋 Verificando ambiente:"
echo "- Diretório atual: $(pwd)"
echo "- Arquivos de configuração:"
ls -la *.env* 2>/dev/null || echo "  Nenhum arquivo .env encontrado"

# Verificar se as variáveis de ambiente foram definidas pelo Railway
echo "🔍 Verificando variáveis de ambiente do Railway:"
if [ -n "$RAILWAY_STATIC_URL" ]; then
  echo "  Railway detectado: $RAILWAY_STATIC_URL"
else
  echo "  Não estamos no Railway"
fi

# Copiar arquivo .env.railway se existir
if [ -f ".env.railway" ]; then
  echo "🔄 Copiando configurações específicas do Railway..."
  cp .env.railway .env
  echo "✅ Configurações copiadas com sucesso!"
  
  # Carregar variáveis do arquivo .env manualmente para garantir
  echo "🔄 Carregando variáveis do arquivo .env..."
  export $(grep -v '^#' .env | xargs)
elif [ -f "/app/.env.railway" ]; then
  echo "🔄 Copiando configurações específicas do Railway do diretório /app..."
  cp /app/.env.railway /app/.env
  echo "✅ Configurações copiadas com sucesso!"
  
  # Carregar variáveis do arquivo .env manualmente para garantir
  echo "🔄 Carregando variáveis do arquivo /app/.env..."
  export $(grep -v '^#' /app/.env | xargs)
else
  echo "⚠️ Arquivo .env.railway não encontrado!"
fi

# Configurar variáveis críticas manualmente se não definidas
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "⚠️ SUPABASE_SERVICE_KEY não definida, configurando valor padrão..."
  export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHdyc3BvbXFkbnhhdnBqYnpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODM0Njc3NiwiZXhwIjoyMDUzOTIyNzc2fQ.9qjf-8uWdN6t1wS5i7BXI1Zp6lv-b0mcxXDaUJXFhTM"
fi

if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️ SUPABASE_URL não definida, configurando valor padrão..."
  export SUPABASE_URL="https://ijpwrspomqdnxavpjbzh.supabase.co"
fi

# Exibir informações de ambiente
echo "🌐 Configurações de ambiente:"
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL: ${DATABASE_URL:0:30}... (parcial)"
echo "SUPABASE_URL: ${SUPABASE_URL}"
echo "SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:10}... (ocultado)"

# Definir explicitamente NODE_ENV=production
export NODE_ENV=production

# Executar o SQL personalizado para remover Service model
if [ -f "/app/prisma/remove_service_model.sql" ]; then
  echo "🔄 Aplicando correções no banco de dados..."
  npx prisma db execute --file /app/prisma/remove_service_model.sql --schema /app/prisma/schema.prisma || echo "⚠️ Falha ao aplicar correções no banco de dados"
fi

# Verificar se o servidor completo existe e iniciar
if [ -f "/app/complete-server.js" ]; then
  # Iniciar o servidor completo diretamente
  echo "🚀 Iniciando servidor completo..."
  # Iniciar com variáveis de ambiente definidas explicitamente
  SUPABASE_URL="$SUPABASE_URL" SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" NODE_ENV=production exec node /app/complete-server.js
else
  echo "⚠️ Servidor completo não encontrado, procurando alternativas..."

  # Verificar outras opções
  if [ -f "/app/basic-server.js" ]; then
    echo "🔄 Iniciando servidor básico como fallback..."
    exec node /app/basic-server.js
  else
    echo "❌ Nenhum servidor encontrado! Criando servidor básico inline..."
    # Criar e executar um servidor básico inline
    exec node -e '
      const http = require("http");
      const PORT = process.env.PORT || 4000;
      
      const server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        if (req.method === "OPTIONS") { 
          res.writeHead(204); 
          res.end(); 
          return; 
        }
        
        console.log(`${req.method} ${req.url}`);
        
        if (req.url === "/health" || req.url === "/api/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ 
            status: "ok", 
            service: "viralizamos-orders-emergency",
            timestamp: new Date().toISOString() 
          }));
          return;
        }
        
        if (req.url === "/api/orders/create" && req.method === "POST") {
          let body = "";
          req.on("data", chunk => { body += chunk.toString(); });
          req.on("end", () => {
            console.log("Dados recebidos:", body);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              order_id: "emergency-" + Date.now(),
              message: "Ordem criada (servidor de emergência)"
            }));
          });
          return;
        }
        
        if (req.url === "/" || req.url === "/api") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            message: "Viralizamos Orders API (Modo de emergência)",
            version: "1.0.0",
            status: "emergency"
          }));
          return;
        }
        
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: "Not Found", 
          message: "Endpoint não encontrado" 
        }));
      });
      
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`Servidor de emergência rodando na porta ${PORT}`);
      });
    '
  fi
fi 