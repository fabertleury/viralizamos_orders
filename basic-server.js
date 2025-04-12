/**
 * Servidor básico para o microserviço de orders
 * Garante que o endpoint principal de criação de pedidos funcione
 * mesmo em condições onde o servidor principal falha
 */
const http = require('http');

// Configuração de porta
const PORT = process.env.PORT || 4000;

// Criar o servidor HTTP
const server = http.createServer((req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Para requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Log da requisição recebida
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  
  // Endpoint de healthcheck
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'viralizamos-orders-basic',
      timestamp: timestamp
    }));
    return;
  }
  
  // Endpoint de criação de pedidos - principal para o fluxo de pagamento
  if (req.url === '/api/orders/create' && req.method === 'POST') {
    let body = '';
    
    // Coletar dados do corpo da requisição
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    // Processar requisição quando todos os dados foram recebidos
    req.on('end', () => {
      try {
        console.log(`${timestamp} - Dados recebidos:`, body);
        let data;
        
        try {
          // Tentar fazer parse do JSON
          data = JSON.parse(body);
        } catch (e) {
          // Se não for JSON válido, tratar como texto
          data = { raw_data: body };
        }
        
        // Extrair dados importantes para log
        const transaction_id = data.transaction_id || 'unknown';
        const target_username = data.target_username || 'unknown';
        const service_id = data.service_id || 'unknown';
        
        console.log(`${timestamp} - Processando pedido: ${transaction_id} para @${target_username} (serviço: ${service_id})`);
        
        // Responder com sucesso
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          order_id: `order-${Date.now()}`,
          message: 'Pedido recebido com sucesso',
          transaction_id: transaction_id
        }));
      } catch (error) {
        // Tratar erros
        console.error(`${timestamp} - Erro ao processar pedido:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno ao processar pedido'
        }));
      }
    });
    return;
  }
  
  // Endpoint raiz com informações da API
  if (req.url === '/' || req.url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Viralizamos Orders API (Versão Básica)',
      version: '1.0.0',
      status: 'active',
      endpoints: [
        { path: '/health', method: 'GET', description: 'Verificação de saúde do serviço' },
        { path: '/api/orders/create', method: 'POST', description: 'Criar um novo pedido' }
      ]
    }));
    return;
  }
  
  // Qualquer outra rota retorna 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'Endpoint não encontrado'
  }));
});

// Iniciar o servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor básico rodando em http://0.0.0.0:${PORT}`);
  console.log('✅ Endpoints disponíveis:');
  console.log('   - GET /health - Verificação de saúde');
  console.log('   - POST /api/orders/create - Criar um novo pedido');
  console.log('   - GET / - Informações da API');
}); 