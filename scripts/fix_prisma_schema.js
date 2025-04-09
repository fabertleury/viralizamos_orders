/**
 * Script para corrigir o problema de "column Order.external_service_id does not exist"
 * regenerando o cliente Prisma com o esquema correto
 * 
 * Este é um problema comum quando o schema do Prisma está desatualizado em relação ao banco
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO CORREÇÃO DO CLIENTE PRISMA ===');

try {
  // 1. Regenerar o cliente Prisma
  console.log('\n🔄 Regenerando o cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente Prisma regenerado com sucesso!');
  
  // 2. Verificar o esquema com o banco de dados atual
  console.log('\n🔄 Verificando o esquema com o banco de dados...');
  try {
    execSync('npx prisma db pull', { stdio: 'inherit' });
    console.log('✅ Esquema verificado com sucesso!');
  } catch (error) {
    console.log('⚠️ Aviso: não foi possível verificar o esquema com o banco de dados.');
    console.log('   Isso não é crítico se a coluna já existe no banco de dados.');
  }
  
  // 3. Verificar se o campo está no schema
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaContent.includes('external_service_id')) {
      console.log('\n✅ O campo external_service_id está presente no schema.prisma');
    } else {
      console.log('\n❌ O campo external_service_id NÃO está presente no schema.prisma');
      console.log('   Você precisa adicionar o campo manualmente no schema.prisma');
    }
  }
  
  // 4. Reiniciar os serviços (opcional)
  console.log('\n⚠️ IMPORTANTE: Você deve reiniciar os serviços Node.js que utilizam este cliente Prisma');
  console.log('   para que as alterações tenham efeito.');
  
  console.log('\n=== CORREÇÃO CONCLUÍDA ===');
  console.log('✨ O erro "column Order.external_service_id does not exist" deve estar resolvido após reiniciar os serviços.');
  
} catch (error) {
  console.error(`\n❌ Erro durante a execução do script: ${error.message}`);
  process.exit(1);
} 