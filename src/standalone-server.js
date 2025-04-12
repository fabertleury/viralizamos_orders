// Servidor standalone básico para o caso do build principal falhar
const http = require('http');
const fs = require('fs');
const path = require('path');

// Obter porta do ambiente
const PORT = process.env.PORT || 4000;

// Criar servidor HTTP básico
const server = http.createServer((req, res) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);
  
  // Rota de healthcheck
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'viralizamos-orders (fallback)',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Rota principal
  if (req.url === '/' || req.url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Viralizamos Orders API (Modo de contingência)',
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

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor fallback rodando na porta ${PORT}`);
  console.log('⚠️ Este é um servidor de contingência com funcionalidade limitada');
  console.log('⚠️ Apenas endpoints básicos de healthcheck estão disponíveis');
}); 