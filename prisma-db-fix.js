/**
 * Script para corrigir a estrutura do banco de dados
 * Verifica e adiciona colunas faltantes em Order, remove constraints problemáticas
 * e atualiza a estrutura conforme o schema do Prisma
 */

const { Pool } = require('pg');

// URL do banco de dados diretamente no código
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway";

// Função principal para fazer as correções
async function fixDatabase() {
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
    
    // 1. Remover constraints problemáticas
    await pool.query(`
      DO $$ 
      BEGIN
        -- Remover a constraint Order_provider_id_fkey se existir
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'Order_provider_id_fkey' 
          AND table_name = 'Order'
        ) THEN
          ALTER TABLE "Order" DROP CONSTRAINT "Order_provider_id_fkey";
          RAISE NOTICE 'Constraint Order_provider_id_fkey removida.';
        ELSE
          RAISE NOTICE 'Constraint Order_provider_id_fkey não encontrada.';
        END IF;
        
        -- Remover a constraint Order_service_id_fkey se existir
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'Order_service_id_fkey' 
          AND table_name = 'Order'
        ) THEN
          ALTER TABLE "Order" DROP CONSTRAINT "Order_service_id_fkey";
          RAISE NOTICE 'Constraint Order_service_id_fkey removida.';
        ELSE
          RAISE NOTICE 'Constraint Order_service_id_fkey não encontrada.';
        END IF;
        
        -- Remover a constraint Order_user_id_fkey se existir
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'Order_user_id_fkey' 
          AND table_name = 'Order'
        ) THEN
          ALTER TABLE "Order" DROP CONSTRAINT "Order_user_id_fkey";
          RAISE NOTICE 'Constraint Order_user_id_fkey removida.';
        ELSE
          RAISE NOTICE 'Constraint Order_user_id_fkey não encontrada.';
        END IF;
      END $$;
    `);
    console.log('Constraints de chave estrangeira removidas com sucesso (ou já não existiam).');
    
    // 2. Verificar e adicionar colunas faltantes na tabela Order
    const orderColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Order'
    `);
    
    const existingColumns = orderColumns.rows.map(row => row.column_name.toLowerCase());
    
    // Lista de colunas necessárias e seus tipos
    const requiredColumns = [
      { name: 'processed', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'processed_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'external_service_id', type: 'TEXT' },
      { name: 'user_id', type: 'TEXT' },
      { name: 'service_id', type: 'TEXT' }
    ];
    
    // Adicionar cada coluna faltante
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name.toLowerCase())) {
        console.log(`Adicionando coluna ${column.name} à tabela Order...`);
        await pool.query(`
          ALTER TABLE "Order" ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`Coluna ${column.name} adicionada com sucesso!`);
      } else {
        console.log(`A coluna ${column.name} já existe na tabela Order.`);
      }
    }
    
    // 3. Criar índices para as colunas importantes
    console.log('Criando índices para as colunas principais...');
    
    // Lista de índices a serem criados
    const indices = [
      { name: 'Order_transaction_id_idx', column: 'transaction_id' },
      { name: 'Order_external_service_id_idx', column: 'external_service_id' },
      { name: 'Order_status_idx', column: 'status' },
      { name: 'Order_service_id_idx', column: 'service_id' },
      { name: 'Order_provider_id_idx', column: 'provider_id' },
      { name: 'Order_processed_idx', column: 'processed' },
      { name: 'Order_user_id_idx', column: 'user_id' }
    ];
    
    // Criar cada índice (ignorar se já existir)
    for (const index of indices) {
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS "${index.name}" ON "Order"("${index.column}")
        `);
        console.log(`Índice ${index.name} criado (ou já existia).`);
      } catch (indexError) {
        console.warn(`Aviso ao criar índice ${index.name}: ${indexError.message}`);
      }
    }
    
    // 4. Recriar constraints de forma segura
    console.log('Recriando constraints com referência segura (ON DELETE SET NULL)...');
    
    // Verificar se a tabela Provider existe
    const providerExists = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'Provider'
    `);
    
    if (parseInt(providerExists.rows[0].count) > 0) {
      // Recriar a constraint Provider com ON DELETE SET NULL
      await pool.query(`
        ALTER TABLE "Order"
        ADD CONSTRAINT "Order_provider_id_fkey"
        FOREIGN KEY ("provider_id")
        REFERENCES "Provider"("id")
        ON DELETE SET NULL;
      `);
      console.log('Constraint Order_provider_id_fkey recriada com ON DELETE SET NULL.');
  } else {
      console.log('A tabela Provider não existe. Constraint não foi recriada.');
    }
    
    // Verificar se a tabela User existe
    const userExists = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'User'
    `);
    
    if (parseInt(userExists.rows[0].count) > 0) {
      // Recriar a constraint User com ON DELETE SET NULL
      await pool.query(`
        ALTER TABLE "Order"
        ADD CONSTRAINT "Order_user_id_fkey"
        FOREIGN KEY ("user_id")
        REFERENCES "User"("id")
        ON DELETE SET NULL;
      `);
      console.log('Constraint Order_user_id_fkey recriada com ON DELETE SET NULL.');
      } else {
      console.log('A tabela User não existe. Constraint não foi recriada.');
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
fixDatabase()
  .then(() => {
    console.log('Script executado com sucesso.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Falha ao executar o script:', err);
  process.exit(1);
  }); 