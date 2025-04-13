/**
 * Script para testar o acesso ao Supabase e listar provedores e serviços
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wuwkcnimoilcnuxwwnqz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se a chave do Supabase está definida
if (!supabaseKey) {
  console.error('ERRO: SUPABASE_SERVICE_KEY não está definida no arquivo .env');
  process.exit(1);
}

console.log('Conectando ao Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para buscar todos os provedores
async function fetchAllProviders() {
  try {
    console.log('\n🔍 Buscando todos os provedores...');
    
    const { data: providers, error } = await supabase
      .from('providers')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar provedores:', error);
      return [];
    }
    
    console.log(`✅ Encontrados ${providers.length} provedores`);
    return providers;
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    return [];
  }
}

// Função para buscar serviços de um provedor específico
async function fetchProviderServices(providerId) {
  try {
    console.log(`\n🔍 Buscando serviços do provedor ${providerId}...`);
    
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('provider_id', providerId);
    
    if (error) {
      console.error(`Erro ao buscar serviços do provedor ${providerId}:`, error);
      return [];
    }
    
    console.log(`✅ Encontrados ${services.length} serviços para o provedor ${providerId}`);
    return services;
  } catch (error) {
    console.error(`Erro ao buscar serviços do provedor ${providerId}:`, error);
    return [];
  }
}

// Função para buscar detalhes de um serviço específico
async function fetchServiceDetails(serviceId) {
  try {
    console.log(`\n🔍 Buscando detalhes do serviço ${serviceId}...`);
    
    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        provider:provider_id (
          id,
          name,
          slug,
          api_url,
          api_key
        )
      `)
      .eq('id', serviceId)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar detalhes do serviço ${serviceId}:`, error);
      return null;
    }
    
    console.log(`✅ Detalhes do serviço ${serviceId} obtidos com sucesso`);
    return service;
  } catch (error) {
    console.error(`Erro ao buscar detalhes do serviço ${serviceId}:`, error);
    return null;
  }
}

// Função principal para testar o acesso
async function testSupabaseAccess() {
  try {
    // 1. Buscar todos os provedores
    const providers = await fetchAllProviders();
    
    // Se não encontrar provedores, encerrar
    if (providers.length === 0) {
      console.error('Não foram encontrados provedores. Verifique a conexão ou permissões.');
      return;
    }
    
    // Exibir detalhes dos provedores (sem mostrar a chave completa por segurança)
    console.log('\n📋 Detalhes dos provedores:');
    providers.forEach((provider, index) => {
      const apiKeyMasked = provider.api_key 
        ? `${provider.api_key.substring(0, 4)}...${provider.api_key.substring(provider.api_key.length - 4)}` 
        : 'Não definida';
      
      console.log(`\n[${index + 1}] Provedor: ${provider.name} (${provider.id})`);
      console.log(`   Slug: ${provider.slug}`);
      console.log(`   API URL: ${provider.api_url || 'Não definida'}`);
      console.log(`   API Key: ${apiKeyMasked}`);
    });
    
    // 2. Para cada provedor, buscar serviços associados
    for (const provider of providers) {
      const services = await fetchProviderServices(provider.id);
      
      if (services.length > 0) {
        console.log(`\n📋 Serviços do provedor ${provider.name}:`);
        
        services.forEach((service, index) => {
          console.log(`\n   [${index + 1}] Serviço: ${service.name} (${service.id})`);
          console.log(`      Tipo: ${service.type || 'Não definido'}`);
          console.log(`      External ID: ${service.external_id || 'Não definido'}`);
          console.log(`      Preço: ${service.price || 'Não definido'}`);
          console.log(`      Status: ${service.status || 'Não definido'}`);
        });
        
        // 3. Testar a busca detalhada do primeiro serviço
        if (services.length > 0) {
          const serviceDetails = await fetchServiceDetails(services[0].id);
          
          if (serviceDetails) {
            console.log(`\n🔎 Detalhes completos do serviço ${serviceDetails.name}:`);
            console.log(`   ID: ${serviceDetails.id}`);
            console.log(`   External ID: ${serviceDetails.external_id || 'Não definido'}`);
            console.log(`   Provedor: ${serviceDetails.provider?.name || 'Não definido'}`);
            
            // Verificar se temos acesso às informações de API do provedor
            if (serviceDetails.provider) {
              const apiKeyMasked = serviceDetails.provider.api_key 
                ? `${serviceDetails.provider.api_key.substring(0, 4)}...${serviceDetails.provider.api_key.substring(serviceDetails.provider.api_key.length - 4)}` 
                : 'Não definida';
              
              console.log(`   API URL do provedor: ${serviceDetails.provider.api_url || 'Não definida'}`);
              console.log(`   API Key do provedor: ${apiKeyMasked}`);
            }
          }
        }
      } else {
        console.log(`\n❌ Nenhum serviço encontrado para o provedor ${provider.name}`);
      }
    }
    
    console.log('\n✅ Teste de acesso ao Supabase concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao testar acesso ao Supabase:', error);
  }
}

// Executar o teste
testSupabaseAccess().finally(() => {
  console.log('\nTeste finalizado.');
  process.exit(0);
}); 