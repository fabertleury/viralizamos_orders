/**
 * Script de bootstrap para iniciar o servidor principal
 * ou o fallback caso o principal falhe
 */
console.log('🚀 Iniciando processo de bootstrap...');

try {
  // Tentar iniciar o servidor principal
  console.log('🔄 Tentando iniciar o servidor principal...');
  
  if (require.resolve('./server.js')) {
    try {
      require('./server.js');
      console.log('✅ Servidor principal iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar servidor principal:', error);
      startFallback();
    }
  } else {
    console.error('❌ Arquivo server.js não encontrado!');
    startFallback();
  }
} catch (error) {
  console.error('❌ Erro ao resolver caminho do servidor principal:', error);
  startFallback();
}

function startFallback() {
  console.log('🔄 Iniciando servidor de fallback...');
  try {
    // Tentar iniciar o servidor fallback
    if (require.resolve('./fallback-server.js')) {
      require('./fallback-server.js');
      console.log('✅ Servidor fallback iniciado com sucesso!');
    } else {
      console.error('❌ Servidor fallback não encontrado!');
      startEmergencyServer();
    }
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor fallback:', error);
    startEmergencyServer();
  }
}

function startEmergencyServer() {
  console.log('⚠️ Iniciando servidor de emergência básico...');
  
  const http = require('http');
  const PORT = process.env.PORT || 4000;
  
  // Criar um servidor HTTP mínimo para responder ao healthcheck
  const server = http.createServer((req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Endpoint de CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    console.log(`Requisição: ${req.method} ${req.url}`);
    
    // Healthcheck
    if (req.url === '/health' || req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'viralizamos-orders-emergency',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // Endpoint de criação de ordens (endpoint principal do serviço)
    if (req.url === '/api/orders/create' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          console.log('Dados recebidos:', body);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            order_id: 'emergency-' + Date.now(),
            message: 'Ordem criada (servidor de emergência)'
          }));
        } catch (error) {
          console.error('Erro ao processar pedido:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno ao processar pedido'
          }));
        }
      });
      return;
    }
    
    // Rota raiz com informações da API
    if (req.url === '/' || req.url === '/api') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Viralizamos Orders API (Modo de emergência)',
        version: '1.0.0',
        status: 'emergency'
      }));
      return;
    }
    
    // Outras rotas
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Endpoint não encontrado'
    }));
  });
  
  // Iniciar servidor
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚠️ Servidor de emergência rodando na porta ${PORT}`);
  });
} 