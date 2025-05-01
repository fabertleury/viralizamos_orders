/**
 * Script para testar a atualização do metadata das transações
 * Este script conecta diretamente ao banco de dados e atualiza o metadata da transação
 */
const { Client } = require('pg');

// String de conexão com o banco de dados de pagamentos
const paymentsDbUrl = 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway';

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

// Função para atualizar o metadata da transação diretamente no banco de dados
async function testUpdateTransactionMetadata() {
  // Conectar ao banco de dados de pagamentos
  const client = new Client({ connectionString: paymentsDbUrl });
  
  try {
    console.log('Conectando ao banco de dados de pagamentos...');
    await client.connect();
    console.log('Conexão estabelecida com sucesso!');
    
    // Verificar se a transação existe
    console.log(`Verificando se a transação ${testData.transaction_id} existe...`);
    const checkQuery = `
      SELECT id, metadata 
      FROM transactions 
      WHERE id = $1
    `;
    
    const checkResult = await client.query(checkQuery, [testData.transaction_id]);
    
    if (checkResult.rows.length === 0) {
      console.error(`Transação ${testData.transaction_id} não encontrada!`);
      return false;
    }
    
    console.log('Transação encontrada!');
    
    // Obter o metadata atual
    let currentMetadata = {};
    try {
      currentMetadata = JSON.parse(checkResult.rows[0].metadata || '{}');
      console.log('Metadata atual:', JSON.stringify(currentMetadata, null, 2));
    } catch (error) {
      console.error('Erro ao analisar metadata atual:', error);
      // Continuar com um objeto vazio
    }
    
    // Atualizar o metadata
    const updatedMetadata = { ...currentMetadata };
    
    // 1. Adicionar ao array processed_orders se não existir
    if (!updatedMetadata.processed_orders) {
      updatedMetadata.processed_orders = [];
    }
    
    if (!updatedMetadata.processed_orders.includes(testData.order_id)) {
      updatedMetadata.processed_orders.push(testData.order_id);
    }
    
    // 2. Adicionar às provider_responses se não existir
    if (!updatedMetadata.provider_responses) {
      updatedMetadata.provider_responses = [];
    }
    
    // Verificar se já existe uma resposta para este order_id
    const existingResponseIndex = updatedMetadata.provider_responses.findIndex(
      (response) => response.order_id === testData.order_id
    );
    
    if (existingResponseIndex >= 0) {
      // Atualizar a resposta existente
      updatedMetadata.provider_responses[existingResponseIndex] = {
        ...updatedMetadata.provider_responses[existingResponseIndex],
        ...testData.provider_response
      };
    } else {
      // Adicionar nova resposta
      updatedMetadata.provider_responses.push({
        order_id: testData.order_id,
        ...testData.provider_response
      });
    }
    
    // Atualizar o metadata na tabela transactions
    console.log('Atualizando metadata da transação...');
    const updateQuery = `
      UPDATE transactions
      SET metadata = $1
      WHERE id = $2
    `;
    
    await client.query(updateQuery, [JSON.stringify(updatedMetadata), testData.transaction_id]);
    
    console.log('Metadata atualizado com sucesso!');
    console.log('Novo metadata:', JSON.stringify(updatedMetadata, null, 2));
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar metadata da transação:', error);
    return false;
  } finally {
    // Fechar a conexão com o banco de dados
    await client.end();
    console.log('Conexão com o banco de dados fechada');
  }
}

// Executar o teste
testUpdateTransactionMetadata()
  .then(success => {
    console.log(success ? 'Teste concluído com sucesso!' : 'Teste falhou!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
