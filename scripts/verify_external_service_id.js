/**
 * Script para verificar se a coluna external_service_id existe e está corretamente indexada
 * 
 * Este script verifica se a coluna existe na tabela Order e se o índice também existe
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

try {
  console.log('Verificando se a coluna external_service_id existe na tabela Order...');
  
  // Criar um script SQL temporário para verificar a coluna
  const tempColumnSqlFile = path.join(__dirname, 'temp_check_column.sql');
  fs.writeFileSync(tempColumnSqlFile, 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'Order\' AND column_name = \'external_service_id\';');
  
  try {
    console.log('Executando verificação da coluna...');
    const columnResult = execSync(`npx prisma db execute --file ${tempColumnSqlFile}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }).toString();
    
    console.log('\nResultado da verificação da coluna:');
    console.log(columnResult);
    
    if (columnResult.includes('external_service_id')) {
      console.log('✅ Coluna external_service_id existe na tabela Order!');
    } else {
      console.log('❌ A coluna external_service_id NÃO existe na tabela Order!');
    }
  } catch (error) {
    console.log('Erro ao verificar a coluna:', error.message);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempColumnSqlFile)) {
      fs.unlinkSync(tempColumnSqlFile);
    }
  }
  
  // Verificar se o índice existe
  console.log('\nVerificando se o índice para a coluna external_service_id existe...');
  
  // Criar um script SQL temporário para verificar o índice
  const tempIndexSqlFile = path.join(__dirname, 'temp_check_index.sql');
  fs.writeFileSync(tempIndexSqlFile, 'SELECT indexname, indexdef FROM pg_indexes WHERE tablename = \'Order\' AND indexdef LIKE \'%external_service_id%\';');
  
  try {
    console.log('Executando verificação do índice...');
    const indexResult = execSync(`npx prisma db execute --file ${tempIndexSqlFile}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }).toString();
    
    console.log('\nResultado da verificação do índice:');
    console.log(indexResult);
    
    if (indexResult.includes('external_service_id')) {
      console.log('✅ Índice para a coluna external_service_id existe!');
    } else {
      console.log('❌ O índice para a coluna external_service_id NÃO existe!');
      
      // Oferecer a opção de criar o índice se ele não existir
      console.log('\nCriando o índice para a coluna external_service_id...');
      
      const createIndexSqlFile = path.join(__dirname, 'temp_create_index.sql');
      fs.writeFileSync(createIndexSqlFile, 'CREATE INDEX "Order_external_service_id_idx" ON "Order"("external_service_id");');
      
      try {
        execSync(`npx prisma db execute --file ${createIndexSqlFile}`, {
          env: { ...process.env, DATABASE_URL: databaseUrl }
        });
        console.log('✅ Índice criado com sucesso!');
      } catch (indexError) {
        console.log('❌ Erro ao criar o índice:', indexError.message);
      } finally {
        if (fs.existsSync(createIndexSqlFile)) {
          fs.unlinkSync(createIndexSqlFile);
        }
      }
    }
  } catch (error) {
    console.log('Erro ao verificar o índice:', error.message);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempIndexSqlFile)) {
      fs.unlinkSync(tempIndexSqlFile);
    }
  }
  
  // Verificar se o comentário existe
  console.log('\nVerificando se o comentário para a coluna external_service_id existe...');
  
  // Criar um script SQL temporário para verificar o comentário
  const tempCommentSqlFile = path.join(__dirname, 'temp_check_comment.sql');
  fs.writeFileSync(tempCommentSqlFile, `
    SELECT col_description(
      (SELECT oid FROM pg_class WHERE relname = 'Order'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = 'Order') AND attname = 'external_service_id')
    ) as comment;
  `);
  
  try {
    console.log('Executando verificação do comentário...');
    const commentResult = execSync(`npx prisma db execute --file ${tempCommentSqlFile}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    }).toString();
    
    console.log('\nResultado da verificação do comentário:');
    console.log(commentResult);
    
    const hasComment = commentResult.includes('ID do serviço');
    
    if (hasComment) {
      console.log('✅ Comentário para a coluna external_service_id existe!');
    } else {
      console.log('❌ O comentário para a coluna external_service_id NÃO existe ou está incompleto!');
      
      // Oferecer a opção de adicionar o comentário se ele não existir
      console.log('\nAdicionando o comentário para a coluna external_service_id...');
      
      const createCommentSqlFile = path.join(__dirname, 'temp_create_comment.sql');
      fs.writeFileSync(createCommentSqlFile, 'COMMENT ON COLUMN "Order"."external_service_id" IS \'ID do serviço no sistema do provedor - IMPORTANTE para envio ao provedor\';');
      
      try {
        execSync(`npx prisma db execute --file ${createCommentSqlFile}`, {
          env: { ...process.env, DATABASE_URL: databaseUrl }
        });
        console.log('✅ Comentário adicionado com sucesso!');
      } catch (commentError) {
        console.log('❌ Erro ao adicionar o comentário:', commentError.message);
      } finally {
        if (fs.existsSync(createCommentSqlFile)) {
          fs.unlinkSync(createCommentSqlFile);
        }
      }
    }
  } catch (error) {
    console.log('Erro ao verificar o comentário:', error.message);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempCommentSqlFile)) {
      fs.unlinkSync(tempCommentSqlFile);
    }
  }
  
  console.log('\n====================================================');
  console.log('✨ Verificação da coluna external_service_id concluída!');
  console.log('====================================================');
  
} catch (error) {
  console.error('Erro durante a verificação:', error.message);
  process.exit(1);
} 