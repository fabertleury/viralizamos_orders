// Script para testar o agendador localmente
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configurações
const JWT_SECRET = '@@FABERT0312ertLEURY@@';
const API_URL = 'http://localhost:3002/api/admin/scheduler';

// Gerar token JWT
const generateToken = () => {
  return jwt.sign(
    { 
      service: 'admin-test',
      timestamp: Date.now()
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

// Função para chamar a API
async function callAPI(action, queue = null, limit = 10) {
  try {
    const token = generateToken();
    const payload = { action };
    
    if (queue) {
      payload.queue = queue;
    }
    
    if (limit) {
      payload.limit = limit;
    }
    
    console.log(`Chamando API com payload:`, payload);
    
    const response = await axios.post(
      API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Erro na API:', error.response.status, error.response.data);
    } else {
      console.error('Erro ao chamar API:', error.message);
    }
  }
}

// Executar testes
async function runTests() {
  console.log('=== Teste do agendador de tarefas ===');
  
  // Verificar status das filas
  console.log('\n1. Verificando status das filas...');
  await callAPI('status');
  
  // Executar processamento de pedidos pendentes
  console.log('\n2. Executando processamento de pedidos pendentes...');
  await callAPI('run_now', 'pending_orders', 5);
  
  // Aguardar 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Executar verificação de status
  console.log('\n3. Executando verificação de status...');
  await callAPI('run_now', 'status_check', 10);
  
  // Verificar status das filas novamente
  console.log('\n4. Verificando status das filas novamente...');
  await callAPI('status');
}

// Executar os testes
runTests().catch(console.error); 