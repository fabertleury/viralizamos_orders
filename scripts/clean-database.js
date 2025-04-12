// Script para limpar tabelas específicas do banco de dados
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('Iniciando limpeza do banco de dados...');
  console.log('Tabelas a serem limpas: Provider, Social, Subcategory, User, Category');
  
  try {
    // Verificar conexão com o banco
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conectado ao banco de dados');
    
    // Desabilitar temporariamente as restrições de chave estrangeira
    // para poder deletar tabelas com dependências
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    
    // Limpar tabelas em ordem para evitar problemas com chaves estrangeiras
    console.log('\nRemovendo registros das tabelas...');
    
    // 1. Primeiro limpar OrderLog (dependência de Order)
    const deletedOrderLogs = await prisma.orderLog.deleteMany({});
    console.log(`✅ Removidos ${deletedOrderLogs.count} registros da tabela OrderLog`);
    
    // 2. Limpar Order (dependência de Provider, User, Service)
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Removidos ${deletedOrders.count} registros da tabela Order`);
    
    // 3. Limpar Service (dependência de Provider, Category, Subcategory)
    const deletedServices = await prisma.service.deleteMany({});
    console.log(`✅ Removidos ${deletedServices.count} registros da tabela Service`);
    
    // 4. Limpar Subcategory (dependência de Category)
    const deletedSubcategories = await prisma.subcategory.deleteMany({});
    console.log(`✅ Removidos ${deletedSubcategories.count} registros da tabela Subcategory`);
    
    // 5. Limpar Category (dependência de Social)
    const deletedCategories = await prisma.category.deleteMany({});
    console.log(`✅ Removidos ${deletedCategories.count} registros da tabela Category`);
    
    // 6. Limpar Social (sem dependências)
    const deletedSocials = await prisma.social.deleteMany({});
    console.log(`✅ Removidos ${deletedSocials.count} registros da tabela Social`);
    
    // 7. Limpar Provider (sem dependências depois de limpar Orders e Services)
    const deletedProviders = await prisma.provider.deleteMany({});
    console.log(`✅ Removidos ${deletedProviders.count} registros da tabela Provider`);
    
    // 8. Limpar User (sem dependências depois de limpar Orders)
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Removidos ${deletedUsers.count} registros da tabela User`);
    
    // Reabilitar as restrições de chave estrangeira
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    
    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('Você pode agora implementar o novo modelo de integração.');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza do banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a limpeza
cleanDatabase(); 