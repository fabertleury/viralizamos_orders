/**
 * Script para adicionar as colunas 'processed' e 'processed_at' à tabela Order
 */

const { Pool } = require('pg');

// URL do banco de dados diretamente no código
const DATABASE_URL = "postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway";

// Função principal para adicionar as colunas
async function addRequiredColumns() {
  // Conectar diretamente ao PostgreSQL
  const pool = new Pool({ 
    connectionString: DATABASE_URL 
  });
  
  try {
    console.log('Conectando ao banco de dados...');
    
    // Verificar a conexão com o banco de dados
    await pool.query('SELECT 1');
    console.log('Conexão estabelecida com sucesso.');
    
    // Listar tabelas para debug
    console.log('Listando tabelas no banco de dados:');
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Tentar descobrir o nome real da tabela Order
    console.log('Verificando nome real da tabela Order...');
    const orderTable = tables.rows.find(row => 
      row.table_name.toLowerCase() === 'order' || 
      row.table_name.toLowerCase() === '"order"' || 
      row.table_name.toLowerCase() === 'orders' ||
      row.table_name.toLowerCase() === 'Order');
    
    if (!orderTable) {
      console.error('Não foi possível encontrar a tabela Order!');
      throw new Error('Tabela Order não encontrada');
    }
    
    const tableName = orderTable.table_name;
    console.log(`Nome real da tabela Order: ${tableName}`);
    
    // Verificar se a coluna 'processed' já existe
    console.log(`Verificando se a coluna 'processed' já existe em "${tableName}"...`);
    const processedColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      AND column_name = 'processed'
    `);
    
    if (processedColumnCheck.rowCount > 0) {
      console.log(`A coluna 'processed' já existe na tabela "${tableName}".`);
    } else {
      // Adicionar coluna 'processed' à tabela
      console.log(`Adicionando coluna 'processed' à tabela "${tableName}"...`);
      await pool.query(`
        ALTER TABLE "${tableName}"
        ADD COLUMN processed BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('Coluna processed adicionada com sucesso!');
    }
    
    // Verificar se a coluna 'processed_at' já existe
    console.log(`Verificando se a coluna 'processed_at' já existe em "${tableName}"...`);
    const processedAtColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      AND column_name = 'processed_at'
    `);
    
    if (processedAtColumnCheck.rowCount > 0) {
      console.log(`A coluna 'processed_at' já existe na tabela "${tableName}".`);
    } else {
      // Adicionar coluna 'processed_at' à tabela
      console.log(`Adicionando coluna 'processed_at' à tabela "${tableName}"...`);
      await pool.query(`
        ALTER TABLE "${tableName}"
        ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('Coluna processed_at adicionada com sucesso!');
    }
    
    console.log('Operação concluída com sucesso.');
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  } finally {
    // Encerrar a conexão
    await pool.end();
    console.log('Conexão com o banco encerrada.');
  }
}

// Executar o script
addRequiredColumns()
  .then(() => {
    console.log('Script executado com sucesso.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Falha ao executar o script:', err);
    process.exit(1);
  }); 