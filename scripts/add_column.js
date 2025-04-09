/**
 * Script para adicionar a coluna external_service_id à tabela Order
 * utilizando SQL direto para evitar erros de migração do Prisma
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo .env
const envPath = path.join(__dirname, '..', '.env');

// Verificar se o arquivo .env existe
if (!fs.existsSync(envPath)) {
  console.error('Arquivo .env não encontrado. Por favor, crie um arquivo .env com DATABASE_URL.');
  process.exit(1);
}

// Ler o arquivo .env
const envContent = fs.readFileSync(envPath, 'utf8');

// Extrair DATABASE_URL do arquivo .env
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error('DATABASE_URL não encontrada no arquivo .env.');
  process.exit(1);
}

const databaseUrl = match[1];
console.log('Database URL encontrada.');

// Função para executar SQL direto no banco de dados
const executeSql = (sql, description) => {
  console.log(`\n${description}...`);
  
  const tempSqlFile = path.join(__dirname, 'temp_sql_execution.sql');
  
  try {
    fs.writeFileSync(tempSqlFile, sql);
    
    const result = execSync(`npx prisma db execute --file ${tempSqlFile}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }).toString();
    
    console.log('✅ SQL executado com sucesso!');
    return { success: true, result };
  } catch (error) {
    console.log(`❌ Erro ao executar SQL: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
};

// Função para verificar se a coluna existe
const checkColumnExists = () => {
  const result = executeSql(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'external_service_id';`,
    'Verificando se a coluna external_service_id já existe'
  );
  
  return result.success && result.result.includes('external_service_id');
};

// Adicionar a coluna
try {
  console.log('=== INICIANDO CORREÇÃO DO BANCO DE DADOS ===');
  
  // Verificar se a coluna já existe
  const columnExists = checkColumnExists();
  
  if (columnExists) {
    console.log('\n✅ A coluna external_service_id já existe na tabela Order.');
  } else {
    // Adicionar a coluna se não existir
    console.log('\n🔧 A coluna não existe. Adicionando coluna external_service_id...');
    
    const addColumnResult = executeSql(
      `ALTER TABLE "Order" ADD COLUMN "external_service_id" TEXT;`,
      'Adicionando coluna external_service_id'
    );
    
    if (!addColumnResult.success) {
      console.error('Falha ao adicionar a coluna. Abortando.');
      process.exit(1);
    }
  }
  
  // Verificar se o índice existe
  const indexResult = executeSql(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'Order' AND indexdef LIKE '%external_service_id%';`,
    'Verificando se o índice já existe'
  );
  
  if (indexResult.success && indexResult.result.includes('Order_external_service_id_idx')) {
    console.log('\n✅ O índice para a coluna external_service_id já existe.');
  } else {
    // Criar o índice se não existir
    console.log('\n🔧 O índice não existe. Criando índice...');
    
    const createIndexResult = executeSql(
      `CREATE INDEX IF NOT EXISTS "Order_external_service_id_idx" ON "Order"("external_service_id");`,
      'Criando índice para a coluna external_service_id'
    );
    
    if (!createIndexResult.success) {
      console.log('⚠️ Aviso: não foi possível criar o índice, mas a operação continuará.');
    }
  }
  
  // Adicionar comentário à coluna
  const commentResult = executeSql(
    `COMMENT ON COLUMN "Order"."external_service_id" IS 'ID do serviço no sistema do provedor - IMPORTANTE para envio ao provedor';`,
    'Adicionando comentário à coluna'
  );
  
  if (!commentResult.success) {
    console.log('⚠️ Aviso: não foi possível adicionar o comentário à coluna, mas não é crítico.');
  }
  
  // Regenerar o cliente Prisma
  console.log('\n🔄 Gerando cliente Prisma atualizado...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Cliente Prisma gerado com sucesso!');
  } catch (error) {
    console.log(`❌ Erro ao gerar cliente Prisma: ${error.message}`);
  }
  
  console.log('\n=== CORREÇÃO CONCLUÍDA COM SUCESSO ===');
  console.log('✨ A coluna external_service_id agora deve estar disponível para uso no sistema.');
  console.log('✨ O erro "column Order.external_service_id does not exist" deve estar resolvido.');
  
} catch (error) {
  console.error(`\n❌ Erro durante a execução do script: ${error.message}`);
  process.exit(1);
} 