const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para popular a tabela de redes sociais com dados iniciais
 */

// Lista de redes sociais a serem adicionadas
const socialNetworks = [
  {
    name: 'Instagram',
    slug: 'instagram',
    icon: 'instagram',
    description: 'Serviços para aumentar seu engajamento no Instagram',
    active: true,
    order_position: 1,
    metadata: {
      platform_url: 'https://instagram.com',
      primary_color: '#E1306C',
      popular_services: ['curtidas', 'seguidores', 'visualizacoes']
    }
  },
  {
    name: 'TikTok',
    slug: 'tiktok',
    icon: 'tiktok',
    description: 'Serviços para ampliar sua visibilidade no TikTok',
    active: true,
    order_position: 2,
    metadata: {
      platform_url: 'https://tiktok.com',
      primary_color: '#000000',
      popular_services: ['seguidores', 'visualizacoes', 'likes']
    }
  },
  {
    name: 'Facebook',
    slug: 'facebook',
    icon: 'facebook',
    description: 'Serviços para melhorar seu alcance no Facebook',
    active: true,
    order_position: 3,
    metadata: {
      platform_url: 'https://facebook.com',
      primary_color: '#1877F2',
      popular_services: ['curtidas', 'seguidores', 'compartilhamentos']
    }
  },
  {
    name: 'YouTube',
    slug: 'youtube',
    icon: 'youtube',
    description: 'Serviços para crescer seu canal no YouTube',
    active: true,
    order_position: 4,
    metadata: {
      platform_url: 'https://youtube.com',
      primary_color: '#FF0000',
      popular_services: ['inscritos', 'visualizacoes', 'likes']
    }
  },
  {
    name: 'Twitter',
    slug: 'twitter',
    icon: 'twitter',
    description: 'Serviços para aumentar sua relevância no Twitter/X',
    active: true,
    order_position: 5,
    metadata: {
      platform_url: 'https://twitter.com',
      primary_color: '#1DA1F2',
      popular_services: ['seguidores', 'retweets', 'likes']
    }
  },
  {
    name: 'Threads',
    slug: 'threads',
    icon: 'threads',
    description: 'Serviços para crescer sua presença no Threads',
    active: true,
    order_position: 6,
    metadata: {
      platform_url: 'https://threads.net',
      primary_color: '#000000',
      popular_services: ['seguidores', 'likes', 'compartilhamentos']
    }
  },
  {
    name: 'Telegram',
    slug: 'telegram',
    icon: 'telegram',
    description: 'Serviços para aumentar seus membros e visualizações no Telegram',
    active: true,
    order_position: 7,
    metadata: {
      platform_url: 'https://telegram.org',
      primary_color: '#0088CC',
      popular_services: ['membros', 'visualizacoes', 'reacoes']
    }
  },
  {
    name: 'Spotify',
    slug: 'spotify',
    icon: 'spotify',
    description: 'Serviços para impulsionar seus streams e seguidores no Spotify',
    active: true,
    order_position: 8,
    metadata: {
      platform_url: 'https://spotify.com',
      primary_color: '#1DB954',
      popular_services: ['plays', 'seguidores', 'playlists']
    }
  }
];

/**
 * Função para importar as redes sociais
 */
async function seedSocialNetworks() {
  console.log('Iniciando importação de redes sociais...');
  let importCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    for (const socialData of socialNetworks) {
      try {
        // Verificar se a rede social já existe
        const existingSocial = await prisma.social.findUnique({
          where: { slug: socialData.slug }
        });

        if (existingSocial) {
          // Atualizar rede social existente
          await prisma.social.update({
            where: { id: existingSocial.id },
            data: {
              name: socialData.name,
              icon: socialData.icon,
              description: socialData.description,
              active: socialData.active,
              order_position: socialData.order_position,
              metadata: socialData.metadata
            }
          });
          console.log(`Rede social "${socialData.name}" atualizada.`);
          updateCount++;
        } else {
          // Criar nova rede social
          await prisma.social.create({
            data: socialData
          });
          console.log(`Rede social "${socialData.name}" criada.`);
          importCount++;
        }
      } catch (error) {
        console.error(`Erro ao processar rede social "${socialData.name}":`, error);
        errorCount++;
      }
    }

    console.log(`
Importação de redes sociais concluída:
- ${importCount} novas redes sociais criadas
- ${updateCount} redes sociais atualizadas
- ${errorCount} erros durante o processo
    `);
  } catch (error) {
    console.error('Erro durante a importação de redes sociais:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função de importação
seedSocialNetworks()
  .then(() => console.log('Processo finalizado com sucesso!'))
  .catch(e => console.error('Erro no processo:', e)); 