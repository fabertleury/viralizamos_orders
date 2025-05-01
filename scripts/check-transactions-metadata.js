/**
 * Script para verificar o conteúdo da coluna metadata na tabela transactions
 * Este script analisa a estrutura do JSON armazenado e verifica se podemos
 * usar esse campo para armazenar o order_id
 */

const { Client } = require('pg');
require('dotenv').config();

// String de conexão com o banco de dados de pagamentos
const paymentsDbUrl = 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway';

async function checkTransactionsMetadata() {
  // Configuração do cliente PostgreSQL para o banco de pagamentos
  const client = new Client({
    connectionString: paymentsDbUrl
  });

  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log('Conectado ao banco de dados de pagamentos');

    // Verificar se a coluna metadata é do tipo JSON ou JSONB
    const checkColumnTypeQuery = `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'metadata';
    `;

    const columnTypeResult = await client.query(checkColumnTypeQuery);
    
    if (columnTypeResult.rows.length === 0) {
      console.log('A coluna metadata não existe na tabela transactions.');
      return;
    }
    
    const dataType = columnTypeResult.rows[0].data_type;
    console.log(`A coluna metadata é do tipo: ${dataType}`);
    
    // Verificar se a coluna já contém dados
    const checkDataQuery = `
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE metadata IS NOT NULL) as with_data,
             COUNT(*) FILTER (WHERE metadata IS NULL) as without_data
      FROM transactions;
    `;
    
    const dataResult = await client.query(checkDataQuery);
    
    console.log(`\nEstatísticas da coluna metadata:`);
    console.log(`- Total de registros: ${dataResult.rows[0].total}`);
    console.log(`- Registros com metadata: ${dataResult.rows[0].with_data} (${(dataResult.rows[0].with_data / dataResult.rows[0].total * 100).toFixed(2)}%)`);
    console.log(`- Registros sem metadata: ${dataResult.rows[0].without_data} (${(dataResult.rows[0].without_data / dataResult.rows[0].total * 100).toFixed(2)}%)`);
    
    // Verificar a estrutura dos dados na coluna metadata
    if (dataResult.rows[0].with_data > 0) {
      console.log('\nAnalisando a estrutura dos dados na coluna metadata...');
      
      // Obter uma amostra dos dados
      const sampleQuery = `
        SELECT id, metadata
        FROM transactions
        WHERE metadata IS NOT NULL
        LIMIT 10;
      `;
      
      const sampleResult = await client.query(sampleQuery);
      
      console.log('\nAmostra de dados da coluna metadata:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n[${index + 1}] Transaction ID: ${row.id}`);
        try {
          // Se metadata for uma string JSON, tentar fazer o parse
          const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          console.log(JSON.stringify(metadata, null, 2));
          
          // Verificar se já existe um campo order_id no metadata
          if (metadata && metadata.order_id) {
            console.log(`  * Já contém order_id: ${metadata.order_id}`);
          }
        } catch (error) {
          console.log(`  * Erro ao analisar metadata: ${error.message}`);
          console.log(`  * Valor bruto: ${row.metadata}`);
        }
      });
      
      // Verificar se já existe um campo order_id no metadata de algum registro
      const checkOrderIdQuery = `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE metadata::text LIKE '%order_id%';
      `;
      
      try {
        const orderIdResult = await client.query(checkOrderIdQuery);
        
        if (orderIdResult.rows[0].count > 0) {
          console.log(`\nJá existem ${orderIdResult.rows[0].count} registros com um campo order_id no metadata.`);
        } else {
          console.log('\nNenhum registro contém um campo order_id no metadata.');
        }
      } catch (error) {
        console.log(`\nNão foi possível verificar a existência do campo order_id no metadata: ${error.message}`);
      }
    }
    
    // Verificar se podemos usar a coluna metadata para armazenar o order_id
    console.log('\n===== RECOMENDAÇÕES =====');
    
    if (dataType.toLowerCase() === 'jsonb' || dataType.toLowerCase() === 'json') {
      console.log('A coluna metadata é do tipo JSON e pode ser usada para armazenar o order_id.');
      console.log('\nPara atualizar o metadata com o order_id, você pode usar a seguinte consulta SQL:');
      
      const updateSQL = `
        UPDATE transactions
        SET metadata = jsonb_set(
          CASE 
            WHEN metadata IS NULL THEN '{}'::jsonb
            WHEN metadata::text = '' THEN '{}'::jsonb
            ELSE metadata::jsonb
          END,
          '{order_id}',
          to_jsonb('ORDER_ID_VALUE'::text)
        )
        WHERE id = 'TRANSACTION_ID';
      `;
      
      console.log(updateSQL);
      
      console.log('\nPara migrar os order_ids de provider_response_logs para o metadata das transações, você pode usar:');
      
      const migrationSQL = `
        UPDATE transactions t
        SET metadata = jsonb_set(
          CASE 
            WHEN t.metadata IS NULL THEN '{}'::jsonb
            WHEN t.metadata::text = '' THEN '{}'::jsonb
            ELSE t.metadata::jsonb
          END,
          '{order_id}',
          to_jsonb(prl.order_id)
        )
        FROM provider_response_logs prl
        WHERE prl.transaction_id = t.id
        AND prl.order_id IS NOT NULL;
      `;
      
      console.log(migrationSQL);
    } else {
      console.log(`A coluna metadata é do tipo ${dataType}, que não é ideal para armazenar dados estruturados.`);
      console.log('Recomendamos adicionar uma nova coluna order_id do tipo TEXT à tabela transactions.');
    }

  } catch (error) {
    console.error('Erro ao verificar metadata das transações:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    await client.end();
    console.log('\nConexão com o banco de dados fechada');
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  // Executar a função principal
  checkTransactionsMetadata().catch(console.error);
}
