const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeamento dos serviços para categorias e subcategorias corretas
const serviceMapping = {
  'curtidas': {
    categorySlug: 'curtidas-instagram',
    subcategoryMapping: {
      'premium': 'curtidas-premium',
      'brasileiras': 'curtidas-brasileiras',
      'mundiais': 'curtidas-mundiais'
    }
  },
  'seguidores': {
    categorySlug: 'seguidores-instagram',
    subcategoryMapping: {
      'premium': 'seguidores-premium',
      'brasileiros': 'seguidores-brasileiros',
      'mundiais': 'seguidores-mundiais'
    }
  },
  'visualizacoes': {
    categorySlug: 'visualizacoes-instagram',
    subcategoryMapping: {
      'reels': 'visualizacoes-de-reels',
      'stories': 'visualizacoes-de-stories',
      'igtv': 'visualizacoes-de-igtv'
    }
  },
  'comentarios': {
    categorySlug: 'comentarios-instagram',
    subcategoryMapping: {
      'aleatorio': 'comentarios-brasileiros-aleatorios',
      'personalizado': 'comentarios-personalizados',
      'emoji': 'comentarios-emoji'
    }
  },
  'salvamentos': {
    categorySlug: 'salvamentos-instagram',
    subcategoryMapping: {}
  }
};

// Função que determina a categoria e subcategoria com base no nome e tipo do serviço
function determineCategoryAndSubcategory(service) {
  let serviceType = service.type;
  let categorySlug = '';
  let subcategorySlug = '';
  
  // Converter o tipo para o mapeamento (se for 'likes', converter para 'curtidas', etc.)
  if (serviceType === 'likes') serviceType = 'curtidas';
  if (serviceType === 'followers') serviceType = 'seguidores';
  if (serviceType === 'views') serviceType = 'visualizacoes';
  if (serviceType === 'comments') serviceType = 'comentarios';
  
  // Determinar a categoria com base no tipo de serviço
  if (serviceMapping[serviceType]) {
    categorySlug = serviceMapping[serviceType].categorySlug;
    
    // Determinar a subcategoria com base no nome do serviço
    const name = service.name.toLowerCase();
    
    // Para curtidas
    if (serviceType === 'curtidas') {
      if (name.includes('premium')) {
        subcategorySlug = 'curtidas-premium';
      } else if (name.includes('brasil')) {
        subcategorySlug = 'curtidas-brasileiras';
      } else if (name.includes('mund') || name.includes('🔵')) {
        subcategorySlug = 'curtidas-mundiais';
      } else {
        subcategorySlug = 'curtidas-brasileiras'; // Default para curtidas
      }
    }
    
    // Para seguidores
    else if (serviceType === 'seguidores') {
      if (name.includes('premium')) {
        subcategorySlug = 'seguidores-premium';
      } else if (name.includes('brasil') || name.includes('br')) {
        subcategorySlug = 'seguidores-brasileiros';
      } else if (name.includes('mund') || name.includes('🔵')) {
        subcategorySlug = 'seguidores-mundiais';
      } else {
        subcategorySlug = 'seguidores-brasileiros'; // Default para seguidores
      }
    }
    
    // Para visualizações
    else if (serviceType === 'visualizacoes' || serviceType === 'reels') {
      if (name.includes('reels') || service.type === 'reels') {
        subcategorySlug = 'visualizacoes-de-reels';
      } else if (name.includes('stories')) {
        subcategorySlug = 'visualizacoes-de-stories';
      } else if (name.includes('igtv')) {
        subcategorySlug = 'visualizacoes-de-igtv';
      } else {
        subcategorySlug = 'visualizacoes-de-reels'; // Default para visualizações
      }
    }
    
    // Para comentários
    else if (serviceType === 'comentarios') {
      if (name.includes('aleat')) {
        subcategorySlug = 'comentarios-brasileiros-aleatorios';
      } else if (name.includes('personal')) {
        subcategorySlug = 'comentarios-personalizados';
      } else if (name.includes('emoji')) {
        subcategorySlug = 'comentarios-emoji';
      } else {
        subcategorySlug = 'comentarios-brasileiros-aleatorios'; // Default para comentários
      }
    }
  }
  
  return { categorySlug, subcategorySlug };
}

async function main() {
  console.log('Iniciando correção de categorias e subcategorias dos serviços...');
  
  // Buscar o ID da rede social Instagram
  const instagram = await prisma.social.findFirst({
    where: { slug: 'instagram' }
  });
  
  if (!instagram) {
    console.error('Rede social Instagram não encontrada!');
    return;
  }
  
  console.log(`Rede social Instagram encontrada. ID: ${instagram.id}`);
  
  // Buscar todas as categorias do Instagram
  const categories = await prisma.category.findMany({
    where: { social_id: instagram.id },
    include: { subcategories: true }
  });
  
  console.log(`Encontradas ${categories.length} categorias para o Instagram`);
  
  // Mapear categorias e subcategorias por slug
  const categoryMap = {};
  const subcategoryMap = {};
  
  categories.forEach(category => {
    categoryMap[category.slug] = category.id;
    
    category.subcategories.forEach(subcategory => {
      subcategoryMap[subcategory.slug] = subcategory.id;
    });
  });
  
  // Listar as categorias e seus slugs para debug
  console.log("\nCategorias disponíveis:");
  Object.keys(categoryMap).forEach(slug => {
    console.log(`- ${slug}: ${categoryMap[slug]}`);
  });
  
  console.log("\nSubcategorias disponíveis:");
  Object.keys(subcategoryMap).forEach(slug => {
    console.log(`- ${slug}: ${subcategoryMap[slug]}`);
  });
  
  // Buscar todos os serviços sem categoria ou subcategoria
  const unlinkedServices = await prisma.service.findMany({
    where: {
      OR: [
        { category_id: null },
        { subcategory_id: null }
      ],
      platform: 'instagram'
    }
  });
  
  console.log(`\nEncontrados ${unlinkedServices.length} serviços sem categorias ou subcategorias`);
  
  // Atualizar cada serviço
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const service of unlinkedServices) {
    try {
      const { categorySlug, subcategorySlug } = determineCategoryAndSubcategory(service);
      
      if (!categorySlug) {
        console.warn(`Não foi possível determinar a categoria para o serviço "${service.name}" (ID: ${service.id})`);
        continue;
      }
      
      const categoryId = categoryMap[categorySlug];
      let subcategoryId = null;
      
      if (subcategorySlug) {
        subcategoryId = subcategoryMap[subcategorySlug];
      }
      
      if (!categoryId) {
        console.warn(`Categoria com slug "${categorySlug}" não encontrada para o serviço "${service.name}"`);
        continue;
      }
      
      // Adicionar a categoria e subcategoria ao serviço
      await prisma.service.update({
        where: { id: service.id },
        data: {
          category_id: categoryId,
          subcategory_id: subcategoryId
        }
      });
      
      console.log(`Serviço "${service.name}" atualizado com categoria "${categorySlug}" (${categoryId}) e subcategoria "${subcategorySlug}" (${subcategoryId || 'nenhuma'})`);
      updatedCount++;
    } catch (error) {
      console.error(`Erro ao atualizar o serviço "${service.name}":`, error);
      errorCount++;
    }
  }
  
  console.log(`
Correção finalizada:
- ${updatedCount} serviços atualizados com sucesso
- ${errorCount} erros durante o processo
- ${unlinkedServices.length - updatedCount - errorCount} serviços não puderam ser atualizados
  `);
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