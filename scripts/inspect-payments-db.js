/**
 * Script para inspecionar o banco de dados de pagamentos
 * Este script verifica as tabelas e colunas existentes no banco de pagamentos
 * para identificar onde adicionar o campo order_id ou order_external_id
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// String de conexão com o banco de dados de pagamentos
const paymentsDbUrl = 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway';

async function inspectPaymentsDatabase() {
  // Configuração do cliente PostgreSQL para o banco de pagamentos
  const client = new Client({
    connectionString: paymentsDbUrl
  });

  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log('Conectado ao banco de dados de pagamentos');

    // Consulta para obter todas as tabelas
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`\nEncontradas ${tables.length} tabelas no banco de dados de pagamentos:`);
    tables.forEach(table => console.log(`- ${table}`));

    // Objeto para armazenar o schema completo
    const schema = {};

    // Para cada tabela, obter suas colunas
    for (const table of tables) {
      const columnsQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [table]);
      
      // Consulta para obter chaves primárias
      const pkQuery = `
        SELECT 
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
      `;

      const pkResult = await client.query(pkQuery, [table]);
      const primaryKeys = pkResult.rows.map(row => row.column_name);

      // Consulta para obter chaves estrangeiras
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
      `;

      const fkResult = await client.query(fkQuery, [table]);
      const foreignKeys = {};
      
      fkResult.rows.forEach(row => {
        foreignKeys[row.column_name] = {
          table: row.foreign_table_name,
          column: row.foreign_column_name
        };
      });

      // Armazenar informações da tabela
      schema[table] = {
        columns: columnsResult.rows,
        primaryKeys,
        foreignKeys
      };

      console.log(`\n=== Tabela: ${table} ===`);
      console.log('Colunas:');
      columnsResult.rows.forEach(column => {
        let info = `- ${column.column_name} (${column.data_type})`;
        if (primaryKeys.includes(column.column_name)) {
          info += ' [PK]';
        }
        if (column.column_name in foreignKeys) {
          info += ` [FK -> ${foreignKeys[column.column_name].table}.${foreignKeys[column.column_name].column}]`;
        }
        console.log(info);
      });
    }

    // Verificar se já existe algum campo relacionado a order_id
    console.log('\n===== VERIFICANDO CAMPOS RELACIONADOS A ORDERS =====');
    let foundOrderFields = false;
    
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      const orderRelatedColumns = tableInfo.columns.filter(column => 
        column.column_name.toLowerCase().includes('order') || 
        column.column_name.toLowerCase().includes('pedido')
      );
      
      if (orderRelatedColumns.length > 0) {
        console.log(`\nTabela ${tableName} contém campos relacionados a orders:`);
        orderRelatedColumns.forEach(column => {
          console.log(`- ${column.column_name} (${column.data_type})`);
        });
        foundOrderFields = true;
      }
    }
    
    if (!foundOrderFields) {
      console.log('Nenhum campo relacionado a orders encontrado nas tabelas.');
    }

    // Verificar tabelas relacionadas a transações
    console.log('\n===== ANALISANDO TABELAS DE TRANSAÇÕES =====');
    
    const transactionTables = Object.keys(schema).filter(table => 
      table.toLowerCase().includes('transaction') || 
      table.toLowerCase().includes('payment') ||
      table.toLowerCase().includes('pagamento') ||
      table.toLowerCase().includes('transacao')
    );
    
    if (transactionTables.length > 0) {
      console.log('Tabelas relacionadas a transações:');
      transactionTables.forEach(table => {
        console.log(`\n- ${table}`);
        console.log('  Colunas:');
        schema[table].columns.forEach(column => {
          console.log(`  * ${column.column_name} (${column.data_type})`);
        });
      });
    } else {
      console.log('Nenhuma tabela relacionada a transações encontrada.');
    }

    // Verificar tabelas relacionadas a pedidos
    console.log('\n===== ANALISANDO TABELAS DE PEDIDOS =====');
    
    const orderTables = Object.keys(schema).filter(table => 
      table.toLowerCase().includes('order') || 
      table.toLowerCase().includes('pedido')
    );
    
    if (orderTables.length > 0) {
      console.log('Tabelas relacionadas a pedidos:');
      orderTables.forEach(table => {
        console.log(`\n- ${table}`);
        console.log('  Colunas:');
        schema[table].columns.forEach(column => {
          console.log(`  * ${column.column_name} (${column.data_type})`);
        });
      });
    } else {
      console.log('Nenhuma tabela relacionada a pedidos encontrada.');
    }

    // Recomendações
    console.log('\n===== RECOMENDAÇÕES =====');
    
    if (transactionTables.length > 0) {
      console.log('Com base na análise, recomendamos:');
      
      // Verificar se já existe um campo order_id na tabela de transações
      const transactionTable = transactionTables[0];
      const hasOrderId = schema[transactionTable].columns.some(column => 
        column.column_name.toLowerCase() === 'order_id' || 
        column.column_name.toLowerCase() === 'order_external_id'
      );
      
      if (hasOrderId) {
        console.log(`1. A tabela ${transactionTable} já possui um campo para order_id. Use esse campo existente.`);
      } else {
        console.log(`1. Adicionar um campo 'order_id' do tipo TEXT à tabela ${transactionTable}.`);
        console.log(`   ALTER TABLE ${transactionTable} ADD COLUMN order_id TEXT;`);
      }
      
      console.log('2. Modificar o microserviço de orders para enviar o order_id para o serviço de pagamentos após receber a resposta do provedor.');
      console.log('3. Implementar um endpoint no serviço de pagamentos para receber e atualizar o order_id nas transações.');
    } else {
      console.log('Não foi possível identificar a tabela de transações. Recomendamos uma análise mais detalhada do esquema do banco de dados.');
    }

    // Salvar o schema em um arquivo JSON para referência futura
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const schemaPath = path.join(outputDir, 'payments-db-schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    
    console.log(`\nSchema completo salvo em ${schemaPath}`);

  } catch (error) {
    console.error('Erro ao inspecionar banco de dados de pagamentos:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    await client.end();
    console.log('\nConexão com o banco de dados fechada');
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  // Executar a função principal
  inspectPaymentsDatabase().catch(console.error);
}
