/**
 * Script para testar o recebimento do webhook no microserviço de orders
 * 
 * Este script simula um envio do webhook de pagamento aprovado do microserviço de pagamentos
 * diretamente para o endpoint local de webhook do microserviço de orders.
 * 
 * Para executar:
 * node scripts/test-webhook.js
 */

const fetch = require('node-fetch');
const { sign } = require('jsonwebtoken');

// Configurações
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Gerar um payload de teste
function generateTestPayload() {
  const transactionId = 'test-' + Date.now().toString();
  const paymentId = 'payment-' + Date.now().toString();
  
  return {
    type: 'payment_approved',
    transaction_id: transactionId,
    payment_id: paymentId,
    status: 'approved',
    amount: 100.00,
    metadata: {
      service: 'instagram-likes-1000',
      external_service_id: '12',
      profile: 'test_user',
      service_type: 'instagram_likes',
      posts: [
        {
          id: 'post1',
          code: 'ABC123',
          url: 'https://instagram.com/p/ABC123',
          caption: 'Test post'
        }
      ],
      customer: {
        name: 'Teste da Silva',
        email: 'teste@example.com',
        phone: '+5511999999999'
      },
      total_quantity: 1000,
      is_followers_service: false
    }
  };
}

// Gerar token JWT para autenticação
function generateAuthToken(transactionId) {
  return sign(
    { transaction_id: transactionId }, 
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Função principal de teste
async function testWebhook() {
  console.log('=== TESTE DE RECEBIMENTO DE WEBHOOK NO SERVIÇO DE ORDERS ===');
  
  try {
    // Gerar payload de teste
    const payload = generateTestPayload();
    console.log('\nPayload de teste gerado:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Gerar token JWT
    const token = generateAuthToken(payload.transaction_id);
    console.log('\nToken JWT gerado:', token.substring(0, 20) + '...');
    
    // URL do webhook
    const webhookUrl = `${ORDERS_SERVICE_URL}/api/orders/webhook/payment`;
    console.log(`\nEnviando requisição para: ${webhookUrl}`);
    
    // Enviar requisição para o endpoint de webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    // Obter resposta como texto
    const responseText = await response.text();
    
    // Tentar parsear como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    console.log(`\nResposta (status ${response.status}):`);
    console.log(JSON.stringify(responseData, null, 2));
    
    return {
      success: response.ok,
      status: response.status,
      response: responseData
    };
  } catch (error) {
    console.error('\nErro durante o teste:', error);
    return { success: false, error: error.message };
  }
}

// Executar o teste
testWebhook()
  .then(result => {
    console.log('\n=== RESUMO DO TESTE ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Teste concluído com sucesso!');
    } else {
      console.log('\n❌ Teste falhou!');
    }
  })
  .catch(error => {
    console.error('\nErro ao executar teste:', error);
  }); 