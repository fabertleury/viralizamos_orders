// Servidor de healthcheck independente
const http = require('http');

// Criar um servidor HTTP mínimo só para healthcheck
const server = http.createServer((req, res) => {
  console.log(`Healthcheck request: ${req.method} ${req.url}`);
  
  // Responder a qualquer rota com status OK
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    service: 'viralizamos-orders-api',
    timestamp: new Date().toISOString(),
    path: req.url
  }));
});

// Usar a porta fornecida pelo ambiente ou 4000 como fallback
const port = process.env.PORT || 4000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Healthcheck server running on port ${port}`);
});

// Manter o servidor em execução por 60 segundos e depois finalizar
// para permitir que o servidor principal inicie
setTimeout(() => {
  console.log('Shutting down healthcheck server after timeout');
  server.close();
}, 60000); 