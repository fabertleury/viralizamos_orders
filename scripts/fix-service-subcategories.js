const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando correção de subcategorias dos serviços...');
  
  // Buscar as subcategorias do Instagram
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: {
        include: {
          social: {
            where: {
              slug: 'instagram'
            }
          }
        }
      }
    }
  });
  
  const instagramSubcategories = subcategories.filter(s => s.category?.social?.length > 0);
  
  console.log(`\nSubcategorias do Instagram encontradas: ${instagramSubcategories.length}`);
  
  // Mapear subcategorias por nome
  const subcategoriesMap = {};
  
  instagramSubcategories.forEach(subcategory => {
    // Mapear tanto pelo nome quanto pelo slug para maior chance de correspondência
    const nameLower = subcategory.name.toLowerCase();
    subcategoriesMap[nameLower] = subcategory.id;
    subcategoriesMap[subcategory.slug] = subcategory.id;
    
    // Criar variações para facilitar a correspondência
    if (nameLower.includes('brasileiras') || nameLower.includes('brasileiros')) {
      subcategoriesMap['brasileiras'] = subcategory.id;
      subcategoriesMap['brasileiros'] = subcategory.id;
      subcategoriesMap['br'] = subcategory.id;
    }
    
    if (nameLower.includes('mundiais')) {
      subcategoriesMap['mundiais'] = subcategory.id;
      subcategoriesMap['mundial'] = subcategory.id;
    }
    
    if (nameLower.includes('premium')) {
      subcategoriesMap['premium'] = subcategory.id;
    }
    
    if (nameLower.includes('reels')) {
      subcategoriesMap['reels'] = subcategory.id;
    }
    
    if (nameLower.includes('stories')) {
      subcategoriesMap['stories'] = subcategory.id;
    }
    
    if (nameLower.includes('aleatórios')) {
      subcategoriesMap['aleatorios'] = subcategory.id;
      subcategoriesMap['aleatório'] = subcategory.id;
    }
  });
  
  console.log('Mapeamento de subcategorias:');
  console.log(subcategoriesMap);
  
  // Definir as correspondências específicas para cada serviço
  const serviceSubcategoryMapping = {
    // Curtidas
    'Curtidas Brasileiras ⭐ PREMIUM ⭐': 'curtidas premium',
    'Curtidas Brasileiras Instagram - PREMIUM ⭐ ⭐ RESERVA': 'curtidas premium',
    'Curtidas Brasileiras BR ❤️': 'curtidas brasileiras',
    'Curtidas Brasileiras BR ⭐ PREMIUM ⭐': 'curtidas premium',
    '🔵 Curtidas Mundiais': 'curtidas mundiais',
    
    // Seguidores
    'Seguidores Brasileiros Premium BR ⭐': 'seguidores premium',
    'Seguidores Brasileiros BR': 'seguidores brasileiros',
    'Seguidores Mundiais 🔵': 'seguidores mundiais',
    'Seguidores Mundiais -antigo 🔵': 'seguidores mundiais',
    'Seguidores Estrangeiros Teste [✓ 50%+] [HM] | ⚡ 0-3h | ⚡ 10k+/dia |': 'seguidores mundiais',
    
    // Visualizações
    '🎬 Visualizações em REELS': 'visualizações de reels',
    
    // Comentários
    '💬 Comentários Brasileiros Aleatório': 'comentários brasileiros aleatórios',
    '💬 Comentários Brasileiros - Relacionados à Publicação': 'comentários personalizados'
  };
  
  // Buscar todos os serviços sem subcategoria
  const servicesWithoutSubcategory = await prisma.service.findMany({
    where: {
      subcategory_id: null,
      platform: 'instagram'
    },
    include: {
      category: true
    }
  });
  
  console.log(`\nEncontrados ${servicesWithoutSubcategory.length} serviços sem subcategoria`);
  
  // Atualizar cada serviço
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const service of servicesWithoutSubcategory) {
    try {
      // Obter a subcategoria correspondente
      let subcategoryId = null;
      
      // Verificar se há um mapeamento específico para este serviço
      if (serviceSubcategoryMapping[service.name]) {
        const mappedName = serviceSubcategoryMapping[service.name].toLowerCase();
        subcategoryId = subcategoriesMap[mappedName];
      }
      
      // Se não encontrou pelo nome específico, tenta detectar a subcategoria pelo nome do serviço
      if (!subcategoryId) {
        const name = service.name.toLowerCase();
        const categoryType = service.category ? service.category.name.toLowerCase() : '';
        
        // Para curtidas
        if (categoryType.includes('curtidas')) {
          if (name.includes('premium') || name.includes('⭐')) {
            subcategoryId = subcategoriesMap['curtidas premium'];
          } else if (name.includes('brasil') || name.includes('br')) {
            subcategoryId = subcategoriesMap['curtidas brasileiras'];
          } else if (name.includes('mund') || name.includes('🔵')) {
            subcategoryId = subcategoriesMap['curtidas mundiais'];
          }
        }
        
        // Para seguidores
        else if (categoryType.includes('seguidores')) {
          if (name.includes('premium') || name.includes('⭐')) {
            subcategoryId = subcategoriesMap['seguidores premium'];
          } else if (name.includes('brasil') || name.includes('br')) {
            subcategoryId = subcategoriesMap['seguidores brasileiros'];
          } else if (name.includes('mund') || name.includes('🔵')) {
            subcategoryId = subcategoriesMap['seguidores mundiais'];
          } else if (name.includes('estrangeiros')) {
            subcategoryId = subcategoriesMap['seguidores mundiais'];
          }
        }
        
        // Para visualizações
        else if (categoryType.includes('visualizações')) {
          if (name.includes('reels')) {
            subcategoryId = subcategoriesMap['visualizações de reels'];
          } else if (name.includes('stories')) {
            subcategoryId = subcategoriesMap['visualizações de stories'];
          } else if (name.includes('igtv')) {
            subcategoryId = subcategoriesMap['visualizações de igtv'];
          }
        }
        
        // Para comentários
        else if (categoryType.includes('comentários')) {
          if (name.includes('aleat')) {
            subcategoryId = subcategoriesMap['comentários brasileiros aleatórios'];
          } else if (name.includes('personal') || name.includes('relacionad')) {
            subcategoryId = subcategoriesMap['comentários personalizados'];
          } else if (name.includes('emoji')) {
            subcategoryId = subcategoriesMap['comentários emoji'];
          }
        }
      }
      
      // Tentar encontrar a subcategoria pelo slug
      if (!subcategoryId) {
        // Obter as subcategorias disponíveis para a categoria do serviço
        const availableSubcategories = await prisma.subcategory.findMany({
          where: {
            category_id: service.category_id
          }
        });
        
        if (availableSubcategories.length > 0) {
          // Usar a primeira subcategoria disponível como fallback
          subcategoryId = availableSubcategories[0].id;
          console.log(`Usando subcategoria fallback "${availableSubcategories[0].name}" para "${service.name}"`);
        }
      }
      
      if (subcategoryId) {
        // Atualizar a subcategoria do serviço
        await prisma.service.update({
          where: { id: service.id },
          data: {
            subcategory_id: subcategoryId
          }
        });
        
        console.log(`Serviço "${service.name}" atualizado com subcategoria ID: ${subcategoryId}`);
        updatedCount++;
      } else {
        console.warn(`Não foi possível encontrar uma subcategoria adequada para "${service.name}"`);
      }
    } catch (error) {
      console.error(`Erro ao atualizar o serviço "${service.name}":`, error);
      errorCount++;
    }
  }
  
  console.log(`
Correção de subcategorias finalizada:
- ${updatedCount} serviços atualizados com sucesso
- ${errorCount} erros durante o processo
- ${servicesWithoutSubcategory.length - updatedCount - errorCount} serviços não puderam ser atualizados
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