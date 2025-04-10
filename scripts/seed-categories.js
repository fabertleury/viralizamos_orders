const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para popular a tabela de categorias com dados iniciais
 */

async function seedCategories() {
  console.log('Iniciando importação de categorias...');
  let importCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    // Buscar todas as redes sociais
    const socials = await prisma.social.findMany({
      where: { active: true }
    });

    if (socials.length === 0) {
      console.log('Nenhuma rede social encontrada. Execute primeiro o script seed-socials.js');
      return;
    }

    // Mapeamento de categorias por rede social
    const categoriesByPlatform = {
      // Instagram
      instagram: [
        {
          name: 'Curtidas',
          slug: 'curtidas-instagram',
          icon: 'heart',
          description: 'Aumente o engajamento das suas postagens com curtidas reais',
          order_position: 1,
          metadata: {
            popular: true,
            tipo_engajamento: 'imediato',
            platform_specific_id: 'likes'
          }
        },
        {
          name: 'Seguidores',
          slug: 'seguidores-instagram',
          icon: 'users',
          description: 'Amplie seu alcance com seguidores de qualidade',
          order_position: 2,
          metadata: {
            popular: true,
            tipo_engajamento: 'crescimento',
            platform_specific_id: 'followers'
          }
        },
        {
          name: 'Visualizações',
          slug: 'visualizacoes-instagram',
          icon: 'eye',
          description: 'Aumente a visibilidade dos seus vídeos e reels',
          order_position: 3,
          metadata: {
            popular: true,
            tipo_engajamento: 'alcance',
            platform_specific_id: 'views'
          }
        },
        {
          name: 'Comentários',
          slug: 'comentarios-instagram',
          icon: 'comment',
          description: 'Impulsione a interação nas suas postagens com comentários personalizados',
          order_position: 4,
          metadata: {
            popular: false,
            tipo_engajamento: 'interacao',
            platform_specific_id: 'comments'
          }
        },
        {
          name: 'Salvamentos',
          slug: 'salvamentos-instagram',
          icon: 'bookmark',
          description: 'Melhore o algoritmo das suas postagens com mais salvamentos',
          order_position: 5,
          metadata: {
            popular: false,
            tipo_engajamento: 'alcance',
            platform_specific_id: 'saves'
          }
        }
      ],
      
      // TikTok
      tiktok: [
        {
          name: 'Curtidas',
          slug: 'curtidas-tiktok',
          icon: 'heart',
          description: 'Aumente o engajamento dos seus vídeos com curtidas',
          order_position: 1,
          metadata: {
            popular: true,
            tipo_engajamento: 'imediato',
            platform_specific_id: 'likes'
          }
        },
        {
          name: 'Seguidores',
          slug: 'seguidores-tiktok',
          icon: 'users',
          description: 'Amplie seu alcance com mais seguidores',
          order_position: 2,
          metadata: {
            popular: true,
            tipo_engajamento: 'crescimento',
            platform_specific_id: 'followers'
          }
        },
        {
          name: 'Visualizações',
          slug: 'visualizacoes-tiktok',
          icon: 'eye',
          description: 'Aumente a visibilidade dos seus vídeos',
          order_position: 3,
          metadata: {
            popular: true,
            tipo_engajamento: 'alcance',
            platform_specific_id: 'views'
          }
        },
        {
          name: 'Compartilhamentos',
          slug: 'compartilhamentos-tiktok',
          icon: 'share',
          description: 'Amplie o alcance dos seus vídeos com compartilhamentos',
          order_position: 4,
          metadata: {
            popular: false,
            tipo_engajamento: 'distribuicao',
            platform_specific_id: 'shares'
          }
        }
      ],
      
      // Facebook
      facebook: [
        {
          name: 'Curtidas em Páginas',
          slug: 'curtidas-paginas-facebook',
          icon: 'thumbs-up',
          description: 'Aumente a credibilidade da sua página com mais curtidas',
          order_position: 1,
          metadata: {
            popular: true,
            tipo_engajamento: 'credibilidade',
            platform_specific_id: 'page_likes'
          }
        },
        {
          name: 'Seguidores',
          slug: 'seguidores-facebook',
          icon: 'users',
          description: 'Amplie o alcance da sua página com mais seguidores',
          order_position: 2,
          metadata: {
            popular: true,
            tipo_engajamento: 'crescimento',
            platform_specific_id: 'followers'
          }
        },
        {
          name: 'Curtidas em Posts',
          slug: 'curtidas-posts-facebook',
          icon: 'heart',
          description: 'Aumente o engajamento dos seus posts',
          order_position: 3,
          metadata: {
            popular: true,
            tipo_engajamento: 'imediato',
            platform_specific_id: 'post_likes'
          }
        },
        {
          name: 'Visualizações em Vídeos',
          slug: 'visualizacoes-videos-facebook',
          icon: 'eye',
          description: 'Aumente a visibilidade dos seus vídeos',
          order_position: 4,
          metadata: {
            popular: false,
            tipo_engajamento: 'alcance',
            platform_specific_id: 'video_views'
          }
        }
      ],
      
      // YouTube
      youtube: [
        {
          name: 'Inscritos',
          slug: 'inscritos-youtube',
          icon: 'users',
          description: 'Amplie seu canal com mais inscritos',
          order_position: 1,
          metadata: {
            popular: true,
            tipo_engajamento: 'crescimento',
            platform_specific_id: 'subscribers'
          }
        },
        {
          name: 'Visualizações',
          slug: 'visualizacoes-youtube',
          icon: 'eye',
          description: 'Aumente a visibilidade dos seus vídeos',
          order_position: 2,
          metadata: {
            popular: true,
            tipo_engajamento: 'alcance',
            platform_specific_id: 'views'
          }
        },
        {
          name: 'Likes',
          slug: 'likes-youtube',
          icon: 'thumbs-up',
          description: 'Melhore o engajamento dos seus vídeos',
          order_position: 3,
          metadata: {
            popular: true,
            tipo_engajamento: 'imediato',
            platform_specific_id: 'likes'
          }
        },
        {
          name: 'Comentários',
          slug: 'comentarios-youtube',
          icon: 'comment',
          description: 'Aumente a interação nos seus vídeos',
          order_position: 4,
          metadata: {
            popular: false,
            tipo_engajamento: 'interacao',
            platform_specific_id: 'comments'
          }
        }
      ]
    };

    // Processar cada rede social
    for (const social of socials) {
      const categories = categoriesByPlatform[social.slug] || [];
      
      console.log(`Processando categorias para ${social.name} (${social.slug})...`);
      
      // Criar ou atualizar categorias para esta rede social
      for (const categoryData of categories) {
        try {
          // Verificar se a categoria já existe
          const existingCategory = await prisma.category.findUnique({
            where: { slug: categoryData.slug }
          });

          // Dados completos da categoria incluindo a referência à rede social
          const completeData = {
            ...categoryData,
            social_id: social.id
          };

          if (existingCategory) {
            // Atualizar categoria existente
            await prisma.category.update({
              where: { id: existingCategory.id },
              data: completeData
            });
            console.log(`Categoria "${categoryData.name}" atualizada para ${social.name}.`);
            updateCount++;
          } else {
            // Criar nova categoria
            await prisma.category.create({
              data: completeData
            });
            console.log(`Categoria "${categoryData.name}" criada para ${social.name}.`);
            importCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar categoria "${categoryData.name}" para ${social.name}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`
Importação de categorias concluída:
- ${importCount} novas categorias criadas
- ${updateCount} categorias atualizadas
- ${errorCount} erros durante o processo
    `);
  } catch (error) {
    console.error('Erro durante a importação de categorias:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função de importação
seedCategories()
  .then(() => console.log('Processo finalizado com sucesso!'))
  .catch(e => console.error('Erro no processo:', e)); 