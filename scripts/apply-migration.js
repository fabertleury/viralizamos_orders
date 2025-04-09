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
    console.log('Executando comandos SQL para adicionar a coluna...');

    // Executar cada comando SQL separadamente
    console.log('1. Adicionando coluna external_service_id...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "external_service_id" TEXT;`);
    
    console.log('2. Criando índice...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_external_service_id_idx" ON "Order"("external_service_id");`);
    
    console.log('3. Adicionando comentário à coluna...');
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN "Order"."external_service_id" IS 'ID do serviço no sistema do provedor - IMPORTANTE para envio ao provedor';`);
    
    console.log('✅ Migração aplicada com sucesso!');
    
    // Verificar se a coluna foi adicionada
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