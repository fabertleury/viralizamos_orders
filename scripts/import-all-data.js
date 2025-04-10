const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Importar dados extraídos
let providersData = [];
let servicesData = [];

try {
  providersData = require('./data/providers-data.js');
  servicesData = require('./data/services-data.js');
  console.log(`Dados carregados: ${providersData.length} providers, ${servicesData.length} serviços`);
} catch (error) {
  console.error('Erro ao carregar dados extraídos. Execute primeiro o script extract-sql-data.js:', error);
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Script para importar todos os dados do sistema
 * Na ordem correta para manter a integridade referencial:
 * 1. Socials (redes sociais)
 * 2. Categories (categorias)
 * 3. Subcategories (subcategorias)
 * 4. Providers (provedores)
 * 5. Services (serviços)
 */

// DADOS DE REDES SOCIAIS
const socialsData = [
  {
    id: 1,
    name: 'Instagram',
    icon: 'instagram',
    domain: 'instagram.com',
    is_active: true,
  },
  {
    id: 2,
    name: 'YouTube',
    icon: 'youtube',
    domain: 'youtube.com',
    is_active: true,
  },
  {
    id: 3,
    name: 'TikTok',
    icon: 'tiktok',
    domain: 'tiktok.com',
    is_active: true,
  },
  {
    id: 4,
    name: 'Facebook',
    icon: 'facebook',
    domain: 'facebook.com',
    is_active: true,
  }
];

// DADOS DE CATEGORIAS
const categoriesData = [
  {
    id: 1,
    name: 'Engajamento',
    description: 'Serviços de engajamento para redes sociais',
    icon: 'engagement',
    social_id: 1, // Instagram
    is_active: true,
  },
  {
    id: 2,
    name: 'Visualizações',
    description: 'Serviços de visualizações para vídeos',
    icon: 'views',
    social_id: 2, // YouTube
    is_active: true,
  },
  {
    id: 3,
    name: 'Seguidores',
    description: 'Serviços para aumentar seguidores',
    icon: 'followers',
    social_id: 1, // Instagram
    is_active: true,
  },
];

// DADOS DE SUBCATEGORIAS
const subcategoriesData = [
  {
    id: 1,
    name: 'Curtidas',
    description: 'Curtidas em posts',
    icon: 'likes',
    category_id: 1, // Engajamento
    is_active: true,
  },
  {
    id: 2,
    name: 'Comentários',
    description: 'Comentários em posts',
    icon: 'comments',
    category_id: 1, // Engajamento
    is_active: true,
  },
  {
    id: 3,
    name: 'Seguidores Brasileiros',
    description: 'Seguidores de contas brasileiras',
    icon: 'followers_br',
    category_id: 3, // Seguidores
    is_active: true,
  },
];

/**
 * Função para importar redes sociais
 */
async function importSocials() {
  console.log('Importando sociais...');
  const created = [];
  const updated = [];
  const errors = [];

  for (const social of socialsData) {
    try {
      // Verificar se já existe
      const existingSocial = await prisma.social.findUnique({
        where: { id: social.id },
      });

      if (existingSocial) {
        // Atualizar
        await prisma.social.update({
          where: { id: social.id },
          data: social,
        });
        updated.push(social.name);
      } else {
        // Criar novo
        await prisma.social.create({
          data: social,
        });
        created.push(social.name);
      }
    } catch (error) {
      console.error(`Erro ao processar social ${social.name}:`, error);
      errors.push({ name: social.name, error: error.message });
    }
  }

  console.log(`Sociais: ${created.length} criados, ${updated.length} atualizados, ${errors.length} erros`);
}

/**
 * Função para importar categorias
 */
async function importCategories() {
  console.log('Importando categorias...');
  const created = [];
  const updated = [];
  const errors = [];

  for (const category of categoriesData) {
    try {
      // Verificar se já existe
      const existingCategory = await prisma.category.findUnique({
        where: { id: category.id },
      });

      if (existingCategory) {
        // Atualizar
        await prisma.category.update({
          where: { id: category.id },
          data: category,
        });
        updated.push(category.name);
      } else {
        // Criar novo
        await prisma.category.create({
          data: category,
        });
        created.push(category.name);
      }
    } catch (error) {
      console.error(`Erro ao processar categoria ${category.name}:`, error);
      errors.push({ name: category.name, error: error.message });
    }
  }

  console.log(`Categorias: ${created.length} criadas, ${updated.length} atualizadas, ${errors.length} erros`);
}

/**
 * Função para importar subcategorias
 */
async function importSubcategories() {
  console.log('Importando subcategorias...');
  const created = [];
  const updated = [];
  const errors = [];

  for (const subcategory of subcategoriesData) {
    try {
      // Verificar se já existe
      const existingSubcategory = await prisma.subcategory.findUnique({
        where: { id: subcategory.id },
      });

      if (existingSubcategory) {
        // Atualizar
        await prisma.subcategory.update({
          where: { id: subcategory.id },
          data: subcategory,
        });
        updated.push(subcategory.name);
      } else {
        // Criar novo
        await prisma.subcategory.create({
          data: subcategory,
        });
        created.push(subcategory.name);
      }
    } catch (error) {
      console.error(`Erro ao processar subcategoria ${subcategory.name}:`, error);
      errors.push({ name: subcategory.name, error: error.message });
    }
  }

  console.log(`Subcategorias: ${created.length} criadas, ${updated.length} atualizadas, ${errors.length} erros`);
}

/**
 * Função para importar provedores
 */
async function importProviders() {
  console.log('Importando providers...');
  const created = [];
  const updated = [];
  const errors = [];

  for (const provider of providersData) {
    try {
      // Verificar se já existe
      const existingProvider = await prisma.provider.findUnique({
        where: { id: provider.id },
      });

      if (existingProvider) {
        // Atualizar
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            name: provider.name,
            description: provider.description,
            api_key: provider.api_key,
            api_url: provider.api_url,
            is_active: provider.is_active,
            metadata: provider.metadata || {},
          },
        });
        updated.push(provider.name);
      } else {
        // Criar novo
        await prisma.provider.create({
          data: {
            id: provider.id,
            name: provider.name,
            description: provider.description,
            api_key: provider.api_key,
            api_url: provider.api_url,
            is_active: provider.is_active,
            metadata: provider.metadata || {},
          },
        });
        created.push(provider.name);
      }
    } catch (error) {
      console.error(`Erro ao processar provider ${provider.name}:`, error);
      errors.push({ name: provider.name, error: error.message });
    }
  }

  console.log(`Providers: ${created.length} criados, ${updated.length} atualizados, ${errors.length} erros`);
}

/**
 * Função para importar serviços
 */
async function importServices() {
  console.log('Importando serviços...');
  const created = [];
  const updated = [];
  const errors = [];

  for (const service of servicesData) {
    try {
      // Obter valores padrão para campos ausentes
      const defaultQuantity = service.default_quantity || service.min_quantity || 100;
      const platform = service.platform || detectPlatform(service.name);
      const type = service.type || 'regular';

      // Verificar se já existe
      const existingService = await prisma.service.findUnique({
        where: { id: service.id },
      });

      const serviceData = {
        name: service.name,
        type: type,
        platform: platform,
        price: service.price,
        min_quantity: service.min_quantity,
        max_quantity: service.max_quantity,
        default_quantity: defaultQuantity,
        provider_id: service.provider_id,
        external_id: service.external_id,
        category_id: service.category_id || 1, // Categoria padrão
        subcategory_id: service.subcategory_id || 1, // Subcategoria padrão
        is_active: service.is_active,
        metadata: service.metadata || {},
      };

      if (existingService) {
        // Atualizar
        await prisma.service.update({
          where: { id: service.id },
          data: serviceData,
        });
        updated.push(service.name);
      } else {
        // Criar novo
        await prisma.service.create({
          data: {
            id: service.id,
            ...serviceData,
          },
        });
        created.push(service.name);
      }
    } catch (error) {
      console.error(`Erro ao processar serviço ${service.name}:`, error);
      errors.push({ name: service.name, error: error.message });
    }
  }

  console.log(`Serviços: ${created.length} criados, ${updated.length} atualizados, ${errors.length} erros`);
}

// Função para detectar a plataforma com base no nome do serviço
function detectPlatform(serviceName) {
  const nameLower = serviceName.toLowerCase();
  
  if (nameLower.includes('instagram') || nameLower.includes('insta')) {
    return 'instagram';
  } else if (nameLower.includes('youtube') || nameLower.includes('yt')) {
    return 'youtube';
  } else if (nameLower.includes('tiktok') || nameLower.includes('tk')) {
    return 'tiktok';
  } else if (nameLower.includes('facebook') || nameLower.includes('fb')) {
    return 'facebook';
  } else if (nameLower.includes('twitter') || nameLower.includes('x.com')) {
    return 'twitter';
  } else {
    return 'other';
  }
}

/**
 * Função principal para executar a importação na ordem correta
 */
async function importAllData() {
  try {
    console.log('Iniciando importação de todos os dados...');
    
    // Ordem de importação para manter a integridade referencial
    await importSocials();
    await importCategories();
    await importSubcategories();
    await importProviders();
    await importServices();
    
    console.log('Importação concluída com sucesso!');
  } catch (error) {
    console.error('Erro fatal durante importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a importação
importAllData()
  .then(() => console.log('Processo finalizado!'))
  .catch(e => console.error('Erro fatal no processo:', e)); 