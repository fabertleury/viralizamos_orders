const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Verificando conexão com o banco de dados...');
    const testConnection = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Conexão bem-sucedida:', testConnection);

    console.log('\nVerificando a existência da tabela Social...');
    const socialExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'Social'
      ) as exists
    `;
    console.log('Tabela Social existe?', socialExists[0].exists);

    if (socialExists[0].exists) {
      console.log('\nConsultando registros na tabela Social...');
      const socials = await prisma.$queryRaw`SELECT * FROM "Social" ORDER BY order_position ASC`;
      
      console.log(`Encontrados ${socials.length} registros na tabela Social.`);
      
      if (socials.length > 0) {
        console.log('\nPrimeiros registros:');
        socials.slice(0, 3).forEach(social => {
          console.log(`- ID: ${social.id}`);
          console.log(`  Nome: ${social.name}`);
          console.log(`  Slug: ${social.slug}`);
          console.log(`  Ativo: ${social.active}`);
          console.log(`  Posição: ${social.order_position}`);
          console.log('---');
        });
      } else {
        console.log('\nA tabela Social não contém registros.');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar o banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 