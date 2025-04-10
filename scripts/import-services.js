const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para importar serviços do arquivo SQL para o banco de dados PostgreSQL
 */

// Mapeamento de tipos de serviço para padronização
const serviceTypeMap = {
  'curtidas': 'likes',
  'seguidores': 'followers',
  'comentarios': 'comments',
  'reels': 'views',
  'visualizacoes': 'views'
};

// Mapeamento de plataformas baseado no nome do serviço
const platformMap = {
  'Instagram': 'instagram',
  'TikTok': 'tiktok',
  'Facebook': 'facebook',
  'YouTube': 'youtube'
};

// Dados dos serviços extraídos do arquivo SQL
const servicesData = [
  {
    id: '1af30c36-294c-4b6b-9ad6-121c48f3bdbc',
    name: 'Curtidas Brasileiras ⭐PREMIUM ⭐',
    type: 'curtidas',
    price: 3.40,
    min_order: 10,
    max_order: 6000,
    provider_id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
    external_id: '1366',
    metadata: {"origem":"fama_redes","refill":true},
    category_id: '3e7304d2-792b-41f0-84b9-ea5ff44b86fa',
    subcategory_id: '9a9e26ee-208a-4eba-a951-e3389a31ab19',
    service_variations: [
      {"preco":6.99,"quantidade":100,"preco_original":8.99},
      {"preco":12.9,"quantidade":250},
      {"preco":17.9,"quantidade":500},
      {"preco":4,"quantidade":1000},
      {"preco":49.9,"quantidade":2000,"preco_original":75.8},
      {"preco":69.9,"quantidade":3000,"preco_original":89.9},
      {"preco":79.9,"quantidade":4000},
      {"preco":89.9,"quantidade":5000},
      {"preco":99.9,"quantidade":6000,"preco_original":199.9}
    ],
    service_details: [
      {"emoji":"⭐","title":"Perfis Premium ( ORGÂNICOS )"},
      {"emoji":"🐌","title":"Entrega de 1000 a 3500 por dia"},
      {"emoji":"➗","title":"Divida o pacote em até 5 publicações"},
      {"emoji":"🔥","title":"Inicio em 2 min 24h por dia"},
      {"emoji":"🚨","title":"Limite Máximo de 6K Curtidas por Publicação!"}
    ]
  },
  {
    id: '21a0bf66-4590-4deb-8442-6789b5c3ca43',
    name: 'Seguidores Brasileiros Premium 🇧🇷⭐',
    type: 'seguidores',
    price: 25.00,
    min_order: 50,
    max_order: 1000000,
    provider_id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
    external_id: '3',
    metadata: {"origem":"fama_redes","refill":true},
    category_id: '863c2d91-d77c-42e0-91b5-946e09577564',
    subcategory_id: 'd508b6af-7564-4210-a5e5-23d909a187b0',
    service_variations: [
      {"preco":3.99,"quantidade":50,"preco_original":7.99},
      {"preco":7.9,"quantidade":100},
      {"preco":17.9,"quantidade":250,"preco_original":20},
      {"preco":29.8,"quantidade":500},
      {"preco":25,"quantidade":1000},
      {"preco":89.8,"quantidade":1500},
      {"preco":119.9,"quantidade":2000},
      {"preco":149.75,"quantidade":2500},
      {"preco":297,"quantidade":5000},
      {"preco":446,"quantidade":7500},
      {"preco":594,"quantidade":10000}
    ],
    service_details: [
      {"emoji":"⭐","title":"Perfis Premium 100% Reais"},
      {"emoji":"‼️","title":"Até 2k - Média de 24h a 4 Dias"},
      {"emoji":"‼️","title":"De 3 a 5k - Média de 4 a 7 Dias"},
      {"emoji":"‼️","title":"De 5 a 10k - Média de 7 a 10 Dias"},
      {"emoji":"✌️","title":"Perfis Interagem, assiste seus stories "},
      {"emoji":"🐌","title":"Serviço e Lento!"}
    ]
  },
  // Outros serviços foram aqui reduzidos para manter o exemplo conciso
  {
    id: '8a538d55-096d-44cf-afad-f2c43c24cef8',
    name: '👀 Visualizações em REELS',
    type: 'reels',
    price: 0.03,
    min_order: 100,
    max_order: 100000000,
    provider_id: '232399c2-d2c2-482a-9622-9376d4598b3f',
    external_id: '6454',
    metadata: {"origem":"fama_redes","refill":false},
    category_id: 'eca782ec-1a01-4ce7-99ab-38d6e3914e5f',
    subcategory_id: '754f5a28-dbd3-460b-8f7c-907cc5dcea5d',
    service_variations: [
      {"preco":2.99,"quantidade":500,"preco_original":4.99},
      {"preco":4.99,"quantidade":1000},
      {"preco":7.9,"quantidade":2500,"preco_original":9.9},
      {"preco":9.9,"quantidade":5000,"preco_original":14.9},
      {"preco":1,"quantidade":10000,"preco_original":37.9},
      {"preco":19.9,"quantidade":25000,"preco_original":29.9},
      {"preco":39.9,"quantidade":50000},
      {"preco":59.9,"quantidade":100000,"preco_original":79.9},
      {"preco":99.9,"quantidade":200000,"preco_original":159.6},
      {"preco":149.9,"quantidade":500000,"preco_original":397},
      {"preco":299.9,"quantidade":1000000,"preco_original":598}
    ],
    service_details: [
      {"emoji":"⚡","title":"Entrega Rápida 24h por dia"},
      {"emoji":"➗","title":"Divida em até 5 Reels"},
      {"emoji":"♾️","title":"Sem queda de visualização "}
    ]
  }
];

/**
 * Função para detectar a plataforma com base no nome do serviço
 */
function detectPlatform(serviceName) {
  // Por padrão, a maioria dos serviços é para Instagram
  let platform = 'instagram';
  
  if (serviceName.includes('TikTok')) {
    platform = 'tiktok';
  } else if (serviceName.includes('Facebook')) {
    platform = 'facebook';
  } else if (serviceName.includes('YouTube')) {
    platform = 'youtube';
  }
  
  return platform;
}

/**
 * Função para importar os serviços
 */
async function importServices() {
  console.log('Iniciando importação de serviços...');
  let importCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    // Processar cada serviço
    for (const serviceData of servicesData) {
      try {
        const platform = detectPlatform(serviceData.name);
        const serviceType = serviceTypeMap[serviceData.type] || serviceData.type;
        
        // Formatar variações de preço para o formato esperado pelo Prisma
        const formattedVariations = serviceData.service_variations.map(variation => ({
          quantity: variation.quantidade,
          price: variation.preco,
          original_price: variation.preco_original || null
        }));
        
        // Formatar detalhes do serviço
        const formattedDetails = serviceData.service_details.map(detail => ({
          emoji: detail.emoji,
          title: detail.title
        }));
        
        // Preparar os dados para o serviço
        const serviceInfo = {
          id: serviceData.id,
          name: serviceData.name,
          description: serviceData.description || '',
          type: serviceType,
          platform: platform,
          price: serviceData.price,
          min_quantity: parseInt(serviceData.min_order),
          max_quantity: parseInt(serviceData.max_order),
          default_quantity: parseInt(serviceData.min_order),
          provider_id: serviceData.provider_id,
          external_id: serviceData.external_id,
          category_id: serviceData.category_id,
          subcategory_id: serviceData.subcategory_id,
          is_active: true,
          metadata: {
            ...serviceData.metadata,
            variations: formattedVariations,
            details: formattedDetails,
            original_data: {
              type: serviceData.type,
              price: serviceData.price
            }
          }
        };

        // Verificar se o serviço já existe
        const existingService = await prisma.service.findFirst({
          where: {
            id: serviceData.id
          }
        });

        if (existingService) {
          // Atualizar serviço existente
          await prisma.service.update({
            where: { id: existingService.id },
            data: serviceInfo
          });
          console.log(`Serviço "${serviceData.name}" atualizado.`);
          updateCount++;
        } else {
          // Criar novo serviço
          await prisma.service.create({
            data: serviceInfo
          });
          console.log(`Serviço "${serviceData.name}" criado.`);
          importCount++;
        }
      } catch (error) {
        console.error(`Erro ao processar serviço "${serviceData.name}":`, error);
        errorCount++;
      }
    }

    console.log(`
Importação de serviços concluída:
- ${importCount} novos serviços criados
- ${updateCount} serviços atualizados
- ${errorCount} erros durante o processo
    `);
  } catch (error) {
    console.error('Erro durante a importação de serviços:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função de importação
importServices()
  .then(() => console.log('Processo finalizado com sucesso!'))
  .catch(e => console.error('Erro no processo:', e));
