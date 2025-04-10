const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar o ID da rede social Instagram
  const instagram = await prisma.social.findFirst({
    where: { slug: 'instagram' }
  });
  
  if (!instagram) {
    console.error('Rede social Instagram não encontrada!');
    return;
  }
  
  console.log(`\nRede social Instagram encontrada. ID: ${instagram.id}`);
  
  // Buscar todas as categorias do Instagram
  const categories = await prisma.category.findMany({
    where: { social_id: instagram.id },
  });
  
  console.log(`\n===== CATEGORIAS DO INSTAGRAM =====`);
  console.log(`Total: ${categories.length}`);
  
  categories.forEach(category => {
    console.log(`ID: ${category.id}`);
    console.log(`Nome: ${category.name}`);
    console.log(`Slug: ${category.slug}`);
    console.log(`-------------------`);
  });
  
  // Buscar todas as subcategorias 
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: {
        where: {
          social_id: instagram.id
        }
      }
    }
  });
  
  const instagramSubcategories = subcategories.filter(s => s.category);
  
  console.log(`\n===== SUBCATEGORIAS DO INSTAGRAM =====`);
  console.log(`Total: ${instagramSubcategories.length}`);
  
  instagramSubcategories.forEach(subcategory => {
    console.log(`ID: ${subcategory.id}`);
    console.log(`Nome: ${subcategory.name}`);
    console.log(`Slug: ${subcategory.slug}`);
    console.log(`Categoria (ID): ${subcategory.category_id}`);
    console.log(`Categoria (Nome): ${subcategory.category.name}`);
    console.log(`-------------------`);
  });
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