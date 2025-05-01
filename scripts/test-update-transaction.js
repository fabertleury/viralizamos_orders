/**
 * Script para testar a atualização do metadata das transações
 * Este script simula o envio de um pedido para o endpoint de atualização
 */
const axios = require('axios');

// Configuração
const API_URL = 'http://localhost:3000/api/orders/update-transaction';
const API_KEY = process.env.ORDERS_API_KEY || 'test-api-key';

// Dados para teste
const testData = {
  transaction_id: '7b5bd7f1-0318-405a-abf6-23759f24c8e3', // Substitua por um ID de transação real
  order_id: '48dd3c72-5c83-4ac4-a46e-1315a43b20a7', // Substitua por um ID de pedido real
  provider_response: {
    post_code: 'ABC123',
    external_order_id: '12345',
    response_data: {
      id: '48dd3c72-5c83-4ac4-a46e-1315a43b20a7',
      status: 'processing',
      amount: 19.9,
      quantity: 1000,
      target_username: 'teste_usuario',
      target_url: 'https://instagram.com/p/ABC123/',
      customer_name: 'Cliente Teste',
      customer_email: 'cliente@teste.com',
      metadata: {
        post: {
          is_reel: false,
          post_id: '123456789',
          post_url: 'https://instagram.com/p/ABC123/',
          post_code: 'ABC123',
          post_type: 'post'
        },
        user_info: {
          email: 'cliente@teste.com',
          user_id: '21918442-0933-4d3c-b933-31dbd4b8ece5'
        }
      }
    }
  }
};

// Função para enviar a requisição
async function testUpdateTransaction() {
  try {
    console.log('Enviando requisição para atualizar metadata da transação...');
    console.log('Dados:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(API_URL, testData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log('Resposta:', response.status, response.statusText);
    console.log('Dados da resposta:', response.data);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar metadata da transação:');
    
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor');
    } else {
      // Erro ao configurar a requisição
      console.error('Erro:', error.message);
    }
    
    return false;
  }
}

// Executar o teste
testUpdateTransaction()
  .then(success => {
    console.log(success ? 'Teste concluído com sucesso!' : 'Teste falhou!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
