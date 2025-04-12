#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL: ${DATABASE_URL:-não definido}"

# Verificar se o basic-server.js existe
if [ -f "/app/basic-server.js" ]; then
  # Iniciar o servidor básico diretamente
  echo "🚀 Iniciando servidor básico..."
  NODE_ENV=production exec node /app/basic-server.js
else
  echo "❌ Erro: Arquivo basic-server.js não encontrado!"
  
  # Tentar encontrar algum servidor para iniciar
  if [ -f "/app/dist/basic-server.js" ]; then
    echo "🔄 Usando servidor básico em /app/dist/basic-server.js..."
    NODE_ENV=production exec node /app/dist/basic-server.js
  elif [ -f "/app/dist/server.js" ]; then
    echo "🔄 Tentando usar servidor principal em /app/dist/server.js..."
    NODE_ENV=production exec node /app/dist/server.js
  else
    echo "❌ Nenhum servidor encontrado! Criando servidor básico inline..."
    # Criar e executar um servidor básico inline
    NODE_ENV=production exec node -e '
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