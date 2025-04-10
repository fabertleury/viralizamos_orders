const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('VERIFICANDO DADOS NO BANCO DE DADOS...\n');
  
  // Verificar redes sociais
  console.log('===== REDES SOCIAIS =====');
  const socials = await prisma.social.findMany();
  console.log(`Total encontrado: ${socials.length}`);
  console.log(JSON.stringify(socials, null, 2));
  console.log('\n');
  
  // Verificar categorias
  console.log('===== CATEGORIAS =====');
  const categories = await prisma.category.findMany({
    include: {
      social: true
    }
  });
  console.log(`Total encontrado: ${categories.length}`);
  for (const category of categories) {
    console.log(`ID: ${category.id}`);
    console.log(`Nome: ${category.name}`);
    console.log(`Rede Social: ${category.social ? category.social.name : 'Não vinculada'}`);
    console.log('-------------------');
  }
  console.log('\n');
  
  // Verificar subcategorias
  console.log('===== SUBCATEGORIAS =====');
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: {
        include: {
          social: true
        }
      }
    }
  });
  console.log(`Total encontrado: ${subcategories.length}`);
  for (const subcat of subcategories) {
    console.log(`ID: ${subcat.id}`);
    console.log(`Nome: ${subcat.name}`);
    console.log(`Categoria: ${subcat.category ? subcat.category.name : 'Não vinculada'}`);
    console.log(`Rede Social: ${subcat.category?.social ? subcat.category.social.name : 'Não vinculada'}`);
    console.log('-------------------');
  }
  console.log('\n');
  
  // Verificar serviços
  console.log('===== SERVIÇOS =====');
  const services = await prisma.service.findMany({
    include: {
      provider: true,
      category: true,
      subcategory: true
    }
  });
  console.log(`Total encontrado: ${services.length}`);
  console.log(`Serviços por plataforma:`);
  const platformCounts = {};
  services.forEach(service => {
    platformCounts[service.platform] = (platformCounts[service.platform] || 0) + 1;
  });
  console.log(platformCounts);
  
  // Verificar se todos os serviços estão vinculados a categorias e subcategorias
  const unlinkedServices = services.filter(s => !s.category_id || !s.subcategory_id);
  console.log(`\nServiços sem categoria ou subcategoria: ${unlinkedServices.length}`);
  if (unlinkedServices.length > 0) {
    for (const service of unlinkedServices) {
      console.log(`ID: ${service.id}`);
      console.log(`Nome: ${service.name}`);
      console.log(`Categoria: ${service.category_id || 'FALTANDO'}`);
      console.log(`Subcategoria: ${service.subcategory_id || 'FALTANDO'}`);
      console.log('-------------------');
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 