const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para popular a tabela de subcategorias com dados iniciais
 */

async function seedSubcategories() {
  console.log('Iniciando importação de subcategorias...');
  let importCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    // Buscar todas as categorias
    const categories = await prisma.category.findMany({
      include: {
        social: true
      }
    });

    if (categories.length === 0) {
      console.log('Nenhuma categoria encontrada. Execute primeiro o script seed-categories.js');
      return;
    }

    // Mapeamento das categorias por slug para facilitar referência
    const categoryMap = categories.reduce((map, category) => {
      map[category.slug] = category;
      return map;
    }, {});

    // Definição de subcategorias por categoria
    const subcategoriesByCategory = {
      // Instagram - Curtidas
      'curtidas-instagram': [
        {
          name: 'Curtidas Brasileiras',
          slug: 'curtidas-brasileiras-instagram',
          icon: 'heart',
          description: 'Curtidas de usuários brasileiros para suas postagens',
          order_position: 1,
          metadata: {
            popular: true,
            origem: 'brasileira',
            qualidade: 'alta'
          }
        },
        {
          name: 'Curtidas Premium',
          slug: 'curtidas-premium-instagram',
          icon: 'star',
          description: 'Curtidas de contas ativas e de alta qualidade',
          order_position: 2,
          metadata: {
            popular: true,
            origem: 'mista',
            qualidade: 'premium'
          }
        },
        {
          name: 'Curtidas Mundiais',
          slug: 'curtidas-mundiais-instagram',
          icon: 'globe',
          description: 'Curtidas de usuários de todo o mundo',
          order_position: 3,
          metadata: {
            popular: false,
            origem: 'mundial',
            qualidade: 'média'
          }
        }
      ],
      
      // Instagram - Seguidores
      'seguidores-instagram': [
        {
          name: 'Seguidores Brasileiros',
          slug: 'seguidores-brasileiros-instagram',
          icon: 'users',
          description: 'Seguidores brasileiros para seu perfil',
          order_position: 1,
          metadata: {
            popular: true,
            origem: 'brasileira',
            qualidade: 'alta'
          }
        },
        {
          name: 'Seguidores Premium',
          slug: 'seguidores-premium-instagram',
          icon: 'crown',
          description: 'Seguidores de alta qualidade e retenção',
          order_position: 2,
          metadata: {
            popular: true,
            origem: 'mista',
            qualidade: 'premium'
          }
        },
        {
          name: 'Seguidores Mundiais',
          slug: 'seguidores-mundiais-instagram',
          icon: 'globe',
          description: 'Seguidores de diversos países',
          order_position: 3,
          metadata: {
            popular: false,
            origem: 'mundial',
            qualidade: 'média'
          }
        }
      ],
      
      // Instagram - Visualizações
      'visualizacoes-instagram': [
        {
          name: 'Visualizações de Reels',
          slug: 'visualizacoes-reels-instagram',
          icon: 'video',
          description: 'Aumente as visualizações dos seus reels',
          order_position: 1,
          metadata: {
            popular: true,
            tipo_conteudo: 'reels',
            qualidade: 'alta'
          }
        },
        {
          name: 'Visualizações de Stories',
          slug: 'visualizacoes-stories-instagram',
          icon: 'camera',
          description: 'Mais visualizações para seus stories',
          order_position: 2,
          metadata: {
            popular: false,
            tipo_conteudo: 'stories',
            qualidade: 'alta'
          }
        },
        {
          name: 'Visualizações de IGTV',
          slug: 'visualizacoes-igtv-instagram',
          icon: 'tv',
          description: 'Aumente as visualizações dos seus vídeos IGTV',
          order_position: 3,
          metadata: {
            popular: false,
            tipo_conteudo: 'igtv',
            qualidade: 'média'
          }
        }
      ],
      
      // Instagram - Comentários
      'comentarios-instagram': [
        {
          name: 'Comentários Brasileiros Aleatórios',
          slug: 'comentarios-brasileiros-aleatorios-instagram',
          icon: 'comment',
          description: 'Comentários brasileiros genéricos em português',
          order_position: 1,
          metadata: {
            popular: true,
            origem: 'brasileira',
            tipo: 'aleatório'
          }
        },
        {
          name: 'Comentários Personalizados',
          slug: 'comentarios-personalizados-instagram',
          icon: 'edit',
          description: 'Comentários com texto escolhido por você',
          order_position: 2,
          metadata: {
            popular: true,
            origem: 'mista',
            tipo: 'personalizado'
          }
        },
        {
          name: 'Comentários Emoji',
          slug: 'comentarios-emoji-instagram',
          icon: 'smile',
          description: 'Comentários contendo apenas emojis',
          order_position: 3,
          metadata: {
            popular: false,
            origem: 'mundial',
            tipo: 'emoji'
          }
        }
      ],
      
      // TikTok - Visualizações
      'visualizacoes-tiktok': [
        {
          name: 'Visualizações Rápidas',
          slug: 'visualizacoes-rapidas-tiktok',
          icon: 'bolt',
          description: 'Visualizações entregues em alta velocidade',
          order_position: 1,
          metadata: {
            popular: true,
            velocidade: 'rápida',
            qualidade: 'média'
          }
        },
        {
          name: 'Visualizações Premium',
          slug: 'visualizacoes-premium-tiktok',
          icon: 'star',
          description: 'Visualizações de alta qualidade e retenção',
          order_position: 2,
          metadata: {
            popular: true,
            velocidade: 'média',
            qualidade: 'alta'
          }
        }
      ],
      
      // YouTube - Visualizações
      'visualizacoes-youtube': [
        {
          name: 'Visualizações Brasileiras',
          slug: 'visualizacoes-brasileiras-youtube',
          icon: 'eye',
          description: 'Visualizações de usuários brasileiros',
          order_position: 1,
          metadata: {
            popular: true,
            origem: 'brasileira',
            retenção: 'média'
          }
        },
        {
          name: 'Visualizações com Alta Retenção',
          slug: 'visualizacoes-alta-retencao-youtube',
          icon: 'clock',
          description: 'Visualizações com alta duração de tempo assistido',
          order_position: 2,
          metadata: {
            popular: true,
            origem: 'mista',
            retenção: 'alta'
          }
        },
        {
          name: 'Visualizações Mundiais',
          slug: 'visualizacoes-mundiais-youtube',
          icon: 'globe',
          description: 'Visualizações de usuários de todo o mundo',
          order_position: 3,
          metadata: {
            popular: false,
            origem: 'mundial',
            retenção: 'média'
          }
        }
      ]
    };

    // Processar cada categoria e adicionar suas subcategorias
    for (const categorySlug in subcategoriesByCategory) {
      const category = categoryMap[categorySlug];
      
      if (!category) {
        console.log(`Categoria com slug "${categorySlug}" não encontrada, pulando...`);
        continue;
      }
      
      console.log(`Processando subcategorias para ${category.name} (${category.slug})...`);
      
      const subcategories = subcategoriesByCategory[categorySlug];
      
      // Criar ou atualizar subcategorias para esta categoria
      for (const subcategoryData of subcategories) {
        try {
          // Verificar se a subcategoria já existe
          const existingSubcategory = await prisma.subcategory.findUnique({
            where: { slug: subcategoryData.slug }
          });

          // Dados completos da subcategoria incluindo a referência à categoria
          const completeData = {
            ...subcategoryData,
            category_id: category.id
          };

          if (existingSubcategory) {
            // Atualizar subcategoria existente
            await prisma.subcategory.update({
              where: { id: existingSubcategory.id },
              data: completeData
            });
            console.log(`Subcategoria "${subcategoryData.name}" atualizada para ${category.name}.`);
            updateCount++;
          } else {
            // Criar nova subcategoria
            await prisma.subcategory.create({
              data: completeData
            });
            console.log(`Subcategoria "${subcategoryData.name}" criada para ${category.name}.`);
            importCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar subcategoria "${subcategoryData.name}" para ${category.name}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`
Importação de subcategorias concluída:
- ${importCount} novas subcategorias criadas
- ${updateCount} subcategorias atualizadas
- ${errorCount} erros durante o processo
    `);
  } catch (error) {
    console.error('Erro durante a importação de subcategorias:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função de importação
seedSubcategories()
  .then(() => console.log('Processo finalizado com sucesso!'))
  .catch(e => console.error('Erro no processo:', e)); 