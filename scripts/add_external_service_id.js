/**
 * Script para adicionar a coluna external_service_id na tabela Order
 * 
 * Este script executa alterações no esquema do banco de dados usando SQL direto
 * para resolver o erro "column Order.external_service_id does not exist"
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
console.log('Database URL encontrada:', databaseUrl);

try {
  // Executar a migração para adicionar a coluna external_service_id
  console.log('Executando migração para adicionar a coluna external_service_id...');
  
  const migrationFile = path.join(__dirname, '..', 'prisma', 'migrations', 'add_external_service_id.sql');
  
  // Verificar se o arquivo de migração existe
  if (!fs.existsSync(migrationFile)) {
    console.error('Arquivo add_external_service_id.sql não encontrado.');
    process.exit(1);
  }
  
  // Executar a migração usando o cliente pg do Prisma
  execSync(`npx prisma db execute --file ${migrationFile}`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit'
  });

  console.log('Migração executada com sucesso!');

  // Gerar o cliente Prisma atualizado
  console.log('Gerando cliente Prisma...');
  execSync('npx prisma generate', {
    stdio: 'inherit'
  });

  console.log('Cliente Prisma gerado com sucesso!');
  
  console.log('\n====================================================');
  console.log('✅ Coluna external_service_id adicionada com sucesso!');
  console.log('====================================================\n');
  
  // Verificar se a coluna foi adicionada corretamente
  console.log('Verificando se a coluna foi adicionada corretamente...');
  
  // Criar um script SQL temporário para verificar a coluna
  const tempSqlFile = path.join(__dirname, 'temp_check_column.sql');
  fs.writeFileSync(tempSqlFile, 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'Order\' AND column_name = \'external_service_id\';');
  
  try {
    const result = execSync(`npx prisma db execute --file ${tempSqlFile}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }).toString();
    
    console.log('Resultado da verificação:');
    console.log(result);
    
    if (result.includes('external_service_id')) {
      console.log('✅ Coluna external_service_id verificada e existe na tabela!');
    } else {
      console.log('⚠️ A coluna não foi encontrada na verificação. Verifique manualmente.');
    }
  } catch (error) {
    console.log('Erro ao verificar a coluna:', error.message);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
  
} catch (error) {
  console.error('Erro ao executar migração:', error.message);
  process.exit(1);
} 