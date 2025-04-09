/**
 * Script para aplicar manualmente a migração para adicionar a coluna external_service_id
 * 
 * Este script:
 * 1. Conecta ao banco de dados usando a URL do .env
 * 2. Executa a migração para adicionar a coluna external_service_id
 * 3. Atualiza o índice do Prisma para registrar que a migração foi aplicada
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('=== APLICANDO MIGRAÇÃO PARA ADICIONAR COLUNA EXTERNAL_SERVICE_ID ===');

  // Criar cliente Prisma
  const prisma = new PrismaClient();

  try {
    // 1. Ler o SQL da migração
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_external_service_id.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Conteúdo da migração:');
    console.log(migrationSql);
    console.log('\nExecutando migração...');

    // 2. Executar a migração como query raw
    await prisma.$executeRawUnsafe(migrationSql);
    
    console.log('✅ Migração aplicada com sucesso!');
    
    // 3. Verificar se a coluna foi adicionada
    try {
      console.log('\nVerificando se a coluna foi adicionada...');
      
      // Tentar buscar um pedido usando a nova coluna para verificar se ela existe
      const testQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Order' 
        AND column_name = 'external_service_id'
      `;
      
      if (testQuery && testQuery.length > 0) {
        console.log('✅ Coluna external_service_id existe na tabela Order!');
      } else {
        console.log('❌ A coluna não foi encontrada. Pode ter havido um erro na migração.');
      }
    } catch (verifyError) {
      console.error('Erro ao verificar se a coluna foi adicionada:', verifyError);
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
applyMigration().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
}); 