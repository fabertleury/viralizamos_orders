const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para importar serviços a partir dos dados fornecidos nas imagens
 * Realiza o mapeamento entre serviços e provedores
 */

// Dados dos serviços extraídos das imagens
const servicesData = [
  {
    name: "Curtidas Brasileiras ⭐ PREMIUM ⭐",
    provider_id: "f5c051a0-c655-479b-bc74-70b17b6aff28", // Gram Fama Oficial
    external_id: "1366",
    type: "likes",
    platform: "instagram",
    price: 12.50, // Preço aproximado
    min_quantity: 100,
    max_quantity: 10000
  },
  {
    name: "Seguidores Brasileiros Premium BR ⭐",
    provider_id: "f5c051a0-c655-479b-bc74-70b17b6aff28", // Gram Fama Oficial
    external_id: "3",
    type: "followers",
    platform: "instagram",
    price: 25.00, // Preço aproximado
    min_quantity: 100,
    max_quantity: 10000
  },
  {
    name: "Curtidas Brasileiras Instagram - PREMIUM ⭐ ⭐ RESERVA",
    provider_id: "dcd15b48-d42b-476d-b360-90f0b68cce2d", // Fama nas redes
    external_id: "99",
    type: "likes",
    platform: "instagram",
    price: 8.90, // Preço aproximado
    min_quantity: 50,
    max_quantity: 5000
  },
  {
    name: "💬 Comentários Brasileiros Aleatório",
    provider_id: "f5c051a0-c655-479b-bc74-70b17b6aff28", // Gram Fama Oficial
    external_id: "1281",
    type: "comments",
    platform: "instagram",
    price: 15.00, // Preço aproximado
    min_quantity: 10,
    max_quantity: 1000
  },
  {
    name: "Curtidas Brasileiras BR ❤️",
    provider_id: "153eb018-772e-47ff-890f-4f05b924e9ad", // Servicos Redes Sociais
    external_id: "720",
    type: "likes",
    platform: "instagram",
    price: 5.90, // Preço aproximado
    min_quantity: 100,
    max_quantity: 10000
  },
  {
    name: "Seguidores Brasileiros BR",
    provider_id: "153eb018-772e-47ff-890f-4f05b924e9ad", // Servicos Redes Sociais
    external_id: "2126",
    type: "followers",
    platform: "instagram",
    price: 18.00, // Preço aproximado
    min_quantity: 100,
    max_quantity: 5000
  },
  {
    name: "🔵 Curtidas Mundiais",
    provider_id: "153eb018-772e-47ff-890f-4f05b924e9ad", // Servicos Redes Sociais
    external_id: "1528",
    type: "likes",
    platform: "instagram",
    price: 3.50, // Preço aproximado
    min_quantity: 100,
    max_quantity: 20000
  },
  {
    name: "🎬 Visualizações em REELS",
    provider_id: "232399c2-d2c2-482a-9622-9376d4598b3f", // Just Another Panel
    external_id: "6454",
    type: "views",
    platform: "instagram",
    price: 0.90, // Preço aproximado
    min_quantity: 1000,
    max_quantity: 1000000
  },
  {
    name: "Seguidores Mundiais 🔵",
    provider_id: "f5c051a0-c655-479b-bc74-70b17b6aff28", // Gram Fama Oficial
    external_id: "1655",
    type: "followers",
    platform: "instagram",
    price: 5.50, // Preço aproximado
    min_quantity: 100,
    max_quantity: 50000
  },
  {
    name: "Curtidas Brasileiras BR ⭐ PREMIUM ⭐",
    provider_id: "153eb018-772e-47ff-890f-4f05b924e9ad", // Servicos Redes Sociais
    external_id: "2146",
    type: "likes",
    platform: "instagram",
    price: 9.90, // Preço aproximado
    min_quantity: 50,
    max_quantity: 10000
  },
  {
    name: "Seguidores Estrangeiros Teste [✓ 50%+] [HM] | ⚡ 0-3h | ⚡ 10k+/dia |",
    provider_id: "153eb018-772e-47ff-890f-4f05b924e9ad", // Servicos Redes Sociais
    external_id: "2081",
    type: "followers",
    platform: "instagram",
    price: 4.50, // Preço aproximado
    min_quantity: 100,
    max_quantity: 100000
  },
  {
    name: "💬 Comentários Brasileiros - Relacionados à Publicação",
    provider_id: "203a2011-b1eb-4be8-87dd-257db9377072", // Seja Smm
    external_id: "1842",
    type: "comments",
    platform: "instagram",
    price: 25.00, // Preço aproximado
    min_quantity: 5,
    max_quantity: 500
  },
  {
    name: "Seguidores Mundiais -antigo 🔵",
    provider_id: "f5c051a0-c655-479b-bc74-70b17b6aff28", // Gram Fama Oficial
    external_id: "1522",
    type: "followers",
    platform: "instagram",
    price: 4.90, // Preço aproximado
    min_quantity: 100,
    max_quantity: 30000
  }
];

/**
 * Importa os serviços para o banco de dados
 */
async function importServices() {
  console.log('Iniciando importação de serviços das imagens...');
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // Para cada serviço nos dados
    for (const serviceData of servicesData) {
      try {
        // Verificar se o serviço já existe pelo nome e provider_id
        const existingService = await prisma.service.findFirst({
          where: {
            AND: [
              { provider_id: serviceData.provider_id },
              { external_id: serviceData.external_id }
            ]
          }
        });
        
        // Gerar ID único para o serviço se não existir
        const serviceId = existingService?.id || require('crypto').randomUUID();
        
        // Preparar os dados do serviço
        const serviceRecord = {
          provider_id: serviceData.provider_id,
          external_id: serviceData.external_id,
          name: serviceData.name,
          description: `Serviço de ${serviceData.type} para ${serviceData.platform}`,
          type: serviceData.type,
          platform: serviceData.platform,
          price: serviceData.price,
          min_quantity: serviceData.min_quantity,
          max_quantity: serviceData.max_quantity,
          default_quantity: serviceData.min_quantity * 2,
          is_active: true,
          metadata: {
            imported_from: "user_images",
            imported_at: new Date().toISOString()
          }
        };
        
        if (existingService) {
          // Atualizar serviço existente
          console.log(`Atualizando serviço "${serviceData.name}" (${existingService.id}) para o provedor ${serviceData.provider_id}`);
          await prisma.service.update({
            where: { id: existingService.id },
            data: serviceRecord
          });
        } else {
          // Criar novo serviço
          console.log(`Criando serviço "${serviceData.name}" para o provedor ${serviceData.provider_id}`);
          await prisma.service.create({
            data: {
              id: serviceId,
              ...serviceRecord
            }
          });
        }
        
        successCount++;
      } catch (serviceError) {
        console.error(`Erro ao importar serviço "${serviceData.name}":`, serviceError);
        errorCount++;
      }
    }
    
    console.log(`Importação de serviços concluída! Sucessos: ${successCount}, Erros: ${errorCount}`);
  } catch (error) {
    console.error('Erro durante a importação de serviços:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a importação
importServices()
  .then(() => console.log('Processo finalizado!'))
  .catch(e => console.error('Erro no processo:', e)); 