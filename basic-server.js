/**
 * Servidor HTTP básico autônomo para responder aos endpoints essenciais
 * Não depende de nenhuma biblioteca externa
 */
const http = require('http');

// Configuração
const PORT = process.env.PORT || 4000;

// Manipulador de solicitações HTTP
const server = http.createServer((req, res) => {
  // Habilitar CORS para todas as solicitações
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Tratar solicitações OPTIONS (para CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Obter URL e método
  const url = req.url;
  const method = req.method;
  
  console.log(`${new Date().toISOString()} - ${method} ${url}`);
  
  // Rota de healthcheck
  if ((url === '/health' || url === '/api/health') && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'viralizamos-orders-basic',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Rota para criar ordens
  if (url === '/api/orders/create' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        console.log(`${new Date().toISOString()} - Dados recebidos: ${body}`);
        let data;
        try {
          data = JSON.parse(body);
        } catch (e) {
          data = { data: body };
        }
        
        // Responder com sucesso
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          order_id: `order-${Date.now()}`,
          message: 'Ordem criada com sucesso pelo servidor básico',
          received_data: data
        }));
      } catch (error) {
        console.error(`${new Date().toISOString()} - Erro ao processar ordem:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno ao processar pedido'
        }));
      }
    });
    return;
  }
  
  // Rota raiz
  if (url === '/' || url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Viralizamos Orders API (Basic Version)',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        { path: '/health', method: 'GET', description: 'Healthcheck endpoint' },
        { path: '/api/orders/create', method: 'POST', description: 'Create new order' }
      ]
    }));
    return;
  }
  
  // Rota não encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Endpoint não encontrado: ${url}`
  }));
});

// Iniciar o servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  console.log('Endpoints disponíveis:');
  console.log('- GET /health - Healthcheck');
  console.log('- POST /api/orders/create - Criar nova ordem');
  console.log('- GET / - Informações da API');
}); 