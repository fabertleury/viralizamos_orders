const { PrismaClient } = require('@prisma/client');

async function renomearTabelas() {
  console.log('Iniciando processo de renomeação de tabelas...');
  
  // Criar uma instância do Prisma Client
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    console.log('Conectando ao banco de dados...');
    
    // Verificar se as tabelas existem
    console.log('Verificando tabelas existentes...');
    
    // Verificar tabela social
    const socialExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'social'
    `;
    
    if (socialExists[0].count > 0) {
      console.log('Renomeando tabela "social" para "Social"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "social" RENAME TO "Social"`;
    }
    
    // Verificar tabela provider
    const providerExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'provider'
    `;
    
    if (providerExists[0].count > 0) {
      console.log('Renomeando tabela "provider" para "Provider"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "provider" RENAME TO "Provider"`;
    }
    
    // Verificar tabela category
    const categoryExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'category'
    `;
    
    if (categoryExists[0].count > 0) {
      console.log('Renomeando tabela "category" para "Category"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "category" RENAME TO "Category"`;
    }
    
    // Verificar tabela subcategory
    const subcategoryExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'subcategory'
    `;
    
    if (subcategoryExists[0].count > 0) {
      console.log('Renomeando tabela "subcategory" para "Subcategory"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "subcategory" RENAME TO "Subcategory"`;
    }
    
    // Verificar tabela service
    const serviceExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'service'
    `;
    
    if (serviceExists[0].count > 0) {
      console.log('Renomeando tabela "service" para "Service"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "service" RENAME TO "Service"`;
    }
    
    // Verificar tabela order
    const orderExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'order'
    `;
    
    if (orderExists[0].count > 0) {
      console.log('Renomeando tabela "order" para "Order"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "order" RENAME TO "Order"`;
    }
    
    // Verificar tabela orderlog
    const orderlogExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'orderlog'
    `;
    
    if (orderlogExists[0].count > 0) {
      console.log('Renomeando tabela "orderlog" para "OrderLog"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "orderlog" RENAME TO "OrderLog"`;
    }
    
    // Verificar tabela user
    const userExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user'
    `;
    
    if (userExists[0].count > 0) {
      console.log('Renomeando tabela "user" para "User"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "user" RENAME TO "User"`;
    }
    
    // Verificar tabela webhooklog
    const webhooklogExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'webhooklog'
    `;
    
    if (webhooklogExists[0].count > 0) {
      console.log('Renomeando tabela "webhooklog" para "WebhookLog"');
      await prisma.$executeRaw`ALTER TABLE IF EXISTS "webhooklog" RENAME TO "WebhookLog"`;
    }
    
    // Verificar as tabelas atuais
    console.log('Listando tabelas após renomeação:');
    const tabelas = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.table(tabelas);
    
    console.log('Processo concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar os comandos SQL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função principal
renomearTabelas()
  .catch((error) => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  }); 