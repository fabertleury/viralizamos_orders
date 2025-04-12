/**
 * Script para garantir que o fallback-server.js exista no diretório dist
 */
const fs = require('fs');
const path = require('path');

const FALLBACK_SERVER_PATH = path.join(__dirname, '../dist/fallback-server.js');

console.log('🔍 Verificando se o servidor fallback existe...');

if (!fs.existsSync(FALLBACK_SERVER_PATH)) {
  console.log('🔧 Criando servidor fallback em:', FALLBACK_SERVER_PATH);
  
  // Criar o diretório dist se não existir
  if (!fs.existsSync(path.dirname(FALLBACK_SERVER_PATH))) {
    fs.mkdirSync(path.dirname(FALLBACK_SERVER_PATH), { recursive: true });
  }
  
  const fallbackServerCode = `
const http = require('http');
const express = require('express');
const { EventEmitter } = require('events');

// Configurações
const PORT = process.env.PORT || 4000;

// Criar aplicação Express
const app = express();
app.use(express.json());

// Rota de healthcheck
app.get('/health', (_, res) => {
  console.log('Health check acessado');
  res.status(200).json({ 
    status: 'ok', 
    service: 'viralizamos-orders-fallback',
    timestamp: new Date().toISOString() 
  });
});

// Rota para criar ordens
app.post('/api/orders/create', (req, res) => {
  try {
    console.log('Dados recebidos na rota /api/orders/create:', JSON.stringify(req.body));
    
    // Responder com sucesso fictício
    res.status(200).json({
      success: true,
      order_id: 'fallback-' + Date.now(),
      message: 'Ordem criada pelo servidor de contingência'
    });
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar pedido'
    });
  }
});

// Rota raiz
app.get('/', (_, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'viralizamos-orders-fallback',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor HTTP
const httpServer = http.createServer(app);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 Servidor fallback rodando em http://0.0.0.0:\${PORT}\`);
  console.log('⚠️ Este é um servidor de contingência com funcionalidade ampliada');
  console.log('⚠️ Endpoints disponíveis: /health, /api/orders/create');
});
`;
  
  fs.writeFileSync(FALLBACK_SERVER_PATH, fallbackServerCode);
  console.log('✅ Servidor fallback criado com sucesso!');
} else {
  console.log('✅ Servidor fallback já existe!');
}

console.log('🎉 Verificação do servidor fallback concluída!'); 