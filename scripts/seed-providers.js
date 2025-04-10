const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Provedores importados do banco de dados original
const importedProviders = [
  {
    id: '153eb018-772e-47ff-890f-4f05b924e9ad',
    name: 'Servicos Redes Sociais',
    slug: 'servicos-redes-sociais',
    description: '',
    api_key: '109cbfef0a87d4952c8b07ff08424620',
    api_url: 'https://servicosredessociais.com.br/api/v2',
    status: true,
    metadata: {
      balance: 499.03373,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:10.431Z',
      services: ['instagram', 'facebook', 'tiktok'],
      priority: 1
    }
  },
  {
    id: '203a2011-b1eb-4be8-87dd-257db9377072',
    name: 'Seja Smm',
    slug: 'seja-smm',
    description: '',
    api_key: 'e3ff70984b6fddc3ed749a6225080e0b',
    api_url: 'https://sejasmm.com/api/v2',
    status: true,
    metadata: {
      balance: 0,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:09.190Z',
      services: ['instagram'], 
      priority: 2
    }
  },
  {
    id: '232399c2-d2c2-482a-9622-9376d4598b3f',
    name: 'Just Another Panel',
    slug: 'just-another-panel',
    description: '',
    api_key: '888ae74e711fad3f76d22df40db53a2c',
    api_url: 'https://justanotherpanel.com/api/v2',
    status: true,
    metadata: {
      balance: 52.5,
      currency: 'USD',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:07.002Z',
      services: ['instagram', 'youtube', 'twitter'],
      priority: 3
    }
  },
  {
    id: '7da7d672-c907-4474-a700-ca6df4c72842',
    name: 'Mea Smm',
    slug: 'mea-smm',
    description: '',
    api_key: '23ddeq349Prdxazd1223avvcz',
    api_url: 'https://measmm.com/api/v2',
    status: true,
    metadata: {
      balance: 0,
      currency: 'BRL',
      api_error: 'Failed to fetch',
      api_status: 'error',
      last_check: '2025-03-27T14:30:56.103Z',
      services: ['instagram'],
      priority: 4
    }
  },
  {
    id: 'dcd15b48-d42b-476d-b360-90f0b68cce2d',
    name: 'Fama nas redes',
    slug: 'fama-nas-redes',
    description: 'Fama nas Redes',
    api_key: '04be6a53e674e13f548cfd3932c5a3d2',
    api_url: 'https://famanasredes.com.br/api/v2',
    status: true,
    metadata: {
      balance: 10008.1098,
      currency: 'USD',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-22T05:17:25.606Z',
      services: ['instagram', 'facebook', 'tiktok', 'youtube'],
      priority: 0
    }
  },
  {
    id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
    name: 'Gram Fama Oficial',
    slug: 'gram-fama-oficial',
    description: '',
    api_key: 'cb35b061913b505779c100c849d3fb73',
    api_url: 'https://gramfamaoficial.com.br/api/v2',
    status: true,
    metadata: {
      balance: 10,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:05.606Z',
      services: ['instagram'],
      priority: 5
    }
  }
];

// Mapeamento de serviços por provedor (adiciona informações específicas para o sistema identificar)
const serviceMapping = {
  'fama-nas-redes': {
    primary_service: 'instagram',
    service_types: ['likes', 'followers', 'views'],
    recommended_for: ['high_quality', 'guaranteed']
  },
  'servicos-redes-sociais': {
    primary_service: 'multi-platform',
    service_types: ['likes', 'followers', 'views', 'comments'],
    recommended_for: ['bulk_orders', 'diverse_platforms']
  },
  'just-another-panel': {
    primary_service: 'youtube',
    service_types: ['views', 'subscribers', 'likes'],
    recommended_for: ['youtube_promotion', 'international']
  },
  'seja-smm': {
    primary_service: 'instagram',
    service_types: ['reels', 'stories_views'],
    recommended_for: ['instagram_reels']
  },
  'mea-smm': {
    primary_service: 'instagram',
    service_types: ['likes', 'followers'],
    recommended_for: ['backup_provider']
  },
  'gram-fama-oficial': {
    primary_service: 'instagram',
    service_types: ['comments', 'saves', 'engagement'],
    recommended_for: ['brazilian_audience', 'engagement']
  }
};

async function seedProviders() {
  console.log('Iniciando importação de provedores...');
  
  try {
    for (const provider of importedProviders) {
      // Adicionar informações específicas do mapeamento de serviços
      const serviceInfo = serviceMapping[provider.slug] || {};
      
      // Mesclar metadados existentes com informações de serviço
      const enhancedMetadata = {
        ...provider.metadata,
        ...serviceInfo,
        imported_from: 'legacy_database',
        imported_at: new Date().toISOString()
      };
      
      // Verificar se o provedor já existe
      const existingProvider = await prisma.provider.findUnique({
        where: { slug: provider.slug }
      });
      
      if (existingProvider) {
        console.log(`Provedor ${provider.name} (${provider.slug}) já existe. Atualizando...`);
        
        // Atualizar provedor existente
        await prisma.provider.update({
          where: { id: existingProvider.id },
          data: {
            name: provider.name,
            description: provider.description || '',
            api_key: provider.api_key,
            api_url: provider.api_url,
            status: provider.status,
            metadata: enhancedMetadata
          }
        });
      } else {
        console.log(`Criando provedor ${provider.name} (${provider.slug})...`);
        
        // Criar novo provedor
        await prisma.provider.create({
          data: {
            id: provider.id,  // Manter o mesmo ID do sistema original
            name: provider.name,
            slug: provider.slug,
            description: provider.description || '',
            api_key: provider.api_key,
            api_url: provider.api_url,
            status: provider.status,
            metadata: enhancedMetadata
          }
        });
      }
    }
    
    console.log('Provedores configurados com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar provedores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função
seedProviders()
  .then(() => console.log('Concluído!'))
  .catch(e => console.error('Erro:', e)); 