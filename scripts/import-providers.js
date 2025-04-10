const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para importar provedores a partir dos dados SQL exportados
 */

// Dados dos provedores extraídos do arquivo SQL
const providersData = [
  {
    id: '153eb018-772e-47ff-890f-4f05b924e9ad',
    name: 'Servicos Redes Sociais',
    slug: 'servicos-redes-sociais',
    description: '',
    api_key: '109cbfef0a87d4952c8b07ff08424620',
    api_url: 'https://servicosredessociais.com.br/api/v2',
    status: 'true',
    metadata: {
      balance: 499.03373,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:10.431Z'
    },
    created_at: '2025-03-01 21:55:32.434+00',
    updated_at: '2025-03-11 01:57:10.431+00'
  },
  {
    id: '203a2011-b1eb-4be8-87dd-257db9377072',
    name: 'Seja Smm',
    slug: 'seja-smm',
    description: '',
    api_key: 'e3ff70984b6fddc3ed749a6225080e0b',
    api_url: 'https://sejasmm.com/api/v2',
    status: 'true',
    metadata: {
      balance: 0,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:09.190Z'
    },
    created_at: '2025-03-01 21:56:50.714+00',
    updated_at: '2025-03-11 01:57:09.19+00'
  },
  {
    id: '232399c2-d2c2-482a-9622-9376d4598b3f',
    name: 'Just Another Panel',
    slug: 'just-another-panel',
    description: '',
    api_key: '888ae74e711fad3f76d22df40db53a2c',
    api_url: 'https://justanotherpanel.com/api/v2 ',
    status: 'true',
    metadata: {
      balance: 52.5,
      currency: 'USD',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:07.002Z'
    },
    created_at: '2025-03-01 21:57:09.955+00',
    updated_at: '2025-03-11 01:57:07.002+00'
  },
  {
    id: '7da7d672-c907-4474-a700-ca6df4c72842',
    name: 'Mea Smm',
    slug: 'mea-smm',
    description: '',
    api_key: '23ddeq349Prdxazd1223avvcz',
    api_url: 'https://measmm.com/api/v2',
    status: 'true',
    metadata: {
      balance: 0,
      currency: 'BRL',
      api_error: 'Failed to fetch',
      api_status: 'error',
      last_check: '2025-03-27T14:30:56.103Z'
    },
    created_at: '2025-03-01 21:56:34.258+00',
    updated_at: '2025-03-25 16:54:03.051+00'
  },
  {
    id: 'dcd15b48-d42b-476d-b360-90f0b68cce2d',
    name: 'Fama nas redes',
    slug: 'fama-nas-redes',
    description: 'Fama nas Redes',
    api_key: '04be6a53e674e13f548cfd3932c5a3d2',
    api_url: 'https://famanasredes.com.br/api/v2',
    status: 'true',
    metadata: {
      balance: 10008.1098,
      currency: 'USD',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-22T05:17:25.606Z'
    },
    created_at: '2025-01-31 19:41:11.389+00',
    updated_at: '2025-03-22 05:17:25.606+00'
  },
  {
    id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
    name: 'Gram Fama Oficial',
    slug: 'gram-fama-oficial',
    description: '',
    api_key: 'cb35b061913b505779c100c849d3fb73',
    api_url: 'https://gramfamaoficial.com.br/api/v2',
    status: 'true',
    metadata: {
      balance: 10,
      currency: 'BRL',
      api_error: null,
      api_status: 'active',
      last_check: '2025-03-11T01:57:05.606Z'
    },
    created_at: '2025-03-01 21:56:10.999+00',
    updated_at: '2025-03-11 01:57:05.606+00'
  }
];

async function importProviders() {
  console.log('Iniciando importação de provedores...');

  try {
    // Para cada provedor nos dados exportados
    for (const providerData of providersData) {
      // Verificar se o provedor já existe
      const existingProvider = await prisma.provider.findUnique({
        where: { id: providerData.id }
      });

      // Preparar os dados do provedor
      const providerRecord = {
        id: providerData.id,
        name: providerData.name,
        slug: providerData.slug,
        description: providerData.description || '',
        api_key: providerData.api_key,
        api_url: providerData.api_url.trim(),
        status: providerData.status === 'true',
        metadata: providerData.metadata || {}
      };

      if (existingProvider) {
        // Atualizar provedor existente
        console.log(`Atualizando provedor ${providerData.name} (${providerData.id})`);
        await prisma.provider.update({
          where: { id: existingProvider.id },
          data: providerRecord
        });
      } else {
        // Criar novo provedor
        console.log(`Criando provedor ${providerData.name} (${providerData.id})`);
        await prisma.provider.create({
          data: providerRecord
        });
      }
    }

    console.log('Importação de provedores concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a importação de provedores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a importação
importProviders()
  .then(() => console.log('Processo finalizado!'))
  .catch(e => console.error('Erro no processo:', e)); 