#!/bin/sh

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Garantir que as pastas necessárias existam
mkdir -p /app/dist/prisma
mkdir -p /app/public

# Exibir informações de ambiente
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-development}"

# Criar arquivo estático para healthcheck
echo '{"status":"ok","service":"viralizamos-orders"}' > /app/public/health.json

# Verificar arquivos disponíveis
echo "Arquivos disponíveis em /app/dist:"
ls -la /app/dist || echo "Pasta dist não encontrada ou vazia"

# Tentar usar o servidor fallback diretamente
if [ -f "/app/dist/server.js" ]; then
  echo "Iniciando servidor..."
  exec node /app/dist/server.js
else
  echo "Servidor principal não encontrado, usando implementação interna..."
  
  # Servidor HTTP básico inline
  exec node -e "
    const http = require('http');
    const PORT = process.env.PORT || 4000;
    
    const server = http.createServer((req, res) => {
      console.log(\`Requisição recebida: \${req.method} \${req.url}\`);
      
      // Rota de healthcheck
      if (req.url === '/health' || req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'viralizamos-orders (emergency mode)',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      // Rota principal
      if (req.url === '/' || req.url === '/api') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Viralizamos Orders API (Modo de emergência)',
          version: '1.0.0',
          status: 'limited',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      // Erro 404 para outras rotas
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        message: 'O recurso solicitado não existe'
      }));
    });
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(\`🚀 Servidor de emergência rodando na porta \${PORT}\`);
      console.log('⚠️ Este é um servidor de emergência com funcionalidade limitada');
      console.log('⚠️ Apenas endpoints básicos de healthcheck estão disponíveis');
    });
  "
fi 