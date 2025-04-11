const { Client } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

async function testConnection() {
  console.log('=== TESTANDO CONEXÃO DIRETA COM POSTGRESQL ===');
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway';
  console.log('URL de conexão (masked):', connectionString.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1*****$3'));
  
  const client = new Client({
    connectionString
  });

  try {
    console.log('Tentando conectar...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Listar todas as tabelas
    console.log('\n=== TABELAS NO BANCO DE DADOS ===');
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    if (tablesResult.rows.length === 0) {
      console.log('Nenhuma tabela encontrada no banco de dados!');
    } else {
      console.log(`Encontradas ${tablesResult.rows.length} tabelas:`);
      tablesResult.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.table_name}`);
      });
    }
    
    // Verificar tabela Social especificamente
    console.log('\n=== VERIFICANDO TABELA SOCIAL ===');
    const socialTableResult = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Social') as exists"
    );
    
    const socialTableExists = socialTableResult.rows[0].exists;
    console.log(`Tabela Social existe? ${socialTableExists ? 'SIM' : 'NÃO'}`);
    
    if (socialTableExists) {
      // Verificar estrutura da tabela Social
      console.log('\n=== ESTRUTURA DA TABELA SOCIAL ===');
      const columnsResult = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Social' ORDER BY ordinal_position"
      );
      
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
      
      // Contar registros na tabela Social
      const countResult = await client.query('SELECT COUNT(*) as count FROM "Social"');
      console.log(`\nTotal de registros na tabela Social: ${countResult.rows[0].count}`);
      
      // Mostrar alguns registros como exemplo
      if (countResult.rows[0].count > 0) {
        console.log('\n=== AMOSTRA DE REGISTROS NA TABELA SOCIAL ===');
        const samplesResult = await client.query('SELECT * FROM "Social" ORDER BY order_position ASC LIMIT 3');
        samplesResult.rows.forEach((row, i) => {
          console.log(`\nRegistro #${i+1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    }
    
    // Verificar tabela Category
    console.log('\n=== VERIFICANDO TABELA CATEGORY ===');
    const categoryTableResult = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Category') as exists"
    );
    
    const categoryTableExists = categoryTableResult.rows[0].exists;
    console.log(`Tabela Category existe? ${categoryTableExists ? 'SIM' : 'NÃO'}`);
    
    if (categoryTableExists) {
      // Contar registros na tabela Category
      const countResult = await client.query('SELECT COUNT(*) as count FROM "Category"');
      console.log(`Total de registros na tabela Category: ${countResult.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
  } finally {
    await client.end();
    console.log('\n=== TESTE DE CONEXÃO FINALIZADO ===');
  }
}

testConnection(); 