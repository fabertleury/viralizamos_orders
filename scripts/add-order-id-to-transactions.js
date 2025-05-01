/**
 * Script para adicionar o campo order_id à tabela transactions no banco de pagamentos
 * Este script também cria um índice para melhorar a performance de consultas
 */

const { Client } = require('pg');
require('dotenv').config();

// String de conexão com o banco de dados de pagamentos
const paymentsDbUrl = 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway';

async function addOrderIdToTransactions() {
  // Configuração do cliente PostgreSQL para o banco de pagamentos
  const client = new Client({
    connectionString: paymentsDbUrl
  });

  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log('Conectado ao banco de dados de pagamentos');

    // Verificar se o campo order_id já existe na tabela transactions
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'order_id';
    `;

    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('O campo order_id já existe na tabela transactions.');
    } else {
      // Adicionar o campo order_id à tabela transactions
      console.log('Adicionando o campo order_id à tabela transactions...');
      
      const addColumnQuery = `
        ALTER TABLE transactions
        ADD COLUMN order_id TEXT;
      `;
      
      await client.query(addColumnQuery);
      console.log('Campo order_id adicionado com sucesso!');
      
      // Criar um índice para melhorar a performance de consultas
      console.log('Criando índice para o campo order_id...');
      
      const createIndexQuery = `
        CREATE INDEX idx_transactions_order_id ON transactions(order_id);
      `;
      
      await client.query(createIndexQuery);
      console.log('Índice criado com sucesso!');
    }

    // Verificar se existem dados em provider_response_logs que podem ser usados para preencher o campo order_id
    console.log('\nVerificando dados em provider_response_logs...');
    
    const checkDataQuery = `
      SELECT COUNT(*) as count
      FROM provider_response_logs
      WHERE order_id IS NOT NULL;
    `;
    
    const dataResult = await client.query(checkDataQuery);
    
    if (dataResult.rows[0].count > 0) {
      console.log(`Encontrados ${dataResult.rows[0].count} registros com order_id em provider_response_logs.`);
      
      // Verificar se podemos usar esses dados para preencher o campo order_id em transactions
      console.log('Verificando possibilidade de migração de dados...');
      
      const checkMigrationQuery = `
        SELECT COUNT(*) as count
        FROM provider_response_logs prl
        JOIN transactions t ON prl.transaction_id = t.id
        WHERE prl.order_id IS NOT NULL;
      `;
      
      const migrationResult = await client.query(checkMigrationQuery);
      
      if (migrationResult.rows[0].count > 0) {
        console.log(`Podemos migrar ${migrationResult.rows[0].count} order_ids para a tabela transactions.`);
        
        // Perguntar se o usuário deseja migrar os dados
        console.log('\nDeseja migrar os dados agora? (S/N)');
        console.log('Para migrar os dados, execute o seguinte SQL:');
        
        const migrationSQL = `
          UPDATE transactions t
          SET order_id = prl.order_id
          FROM provider_response_logs prl
          WHERE prl.transaction_id = t.id
          AND prl.order_id IS NOT NULL
          AND t.order_id IS NULL;
        `;
        
        console.log(migrationSQL);
      } else {
        console.log('Não foi possível encontrar uma relação direta para migrar os dados.');
      }
    } else {
      console.log('Não foram encontrados registros com order_id em provider_response_logs.');
    }

    // Sugerir próximos passos
    console.log('\n===== PRÓXIMOS PASSOS =====');
    console.log('1. Implementar um endpoint no microserviço de pagamentos para receber e atualizar o order_id nas transações');
    console.log('2. Modificar o microserviço de orders para enviar o order_id para o serviço de pagamentos após receber a resposta do provedor');
    console.log('3. Atualizar o painel de remarketing para usar o campo order_id nas consultas');

  } catch (error) {
    console.error('Erro ao adicionar campo order_id:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    await client.end();
    console.log('\nConexão com o banco de dados fechada');
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  // Executar a função principal
  addOrderIdToTransactions().catch(console.error);
}
