// Este script testa a conexão com o Supabase e verifica se conseguimos buscar informações de serviços e provedores

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('Testando conexão com o Supabase...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas');
    console.error('Por favor adicione estas variáveis no arquivo .env');
    return;
  }

  console.log(`URL do Supabase: ${supabaseUrl}`);
  console.log(`Chave do Supabase configurada: ${supabaseKey.substring(0, 5)}...`);

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Testar conexão com tabela services
    console.log('\nTestando acesso à tabela services...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, provider_id, external_id')
      .limit(3);
    
    if (servicesError) {
      console.error('❌ Erro ao consultar tabela services:', servicesError);
    } else {
      console.log('✅ Conexão com tabela services bem-sucedida!');
      console.log(`Encontrados ${services.length} serviços`);
      
      if (services.length > 0) {
        console.log('\nExemplo de serviços:');
        services.forEach(service => {
          console.log(`- ID: ${service.id}, Nome: ${service.name}, Provider ID: ${service.provider_id || 'N/A'}`);
        });

        // Testar busca de provedor para o primeiro serviço com provider_id
        const serviceWithProvider = services.find(s => s.provider_id);
        
        if (serviceWithProvider) {
          console.log(`\nBuscando provedor para o serviço: ${serviceWithProvider.name}`);
          
          const { data: provider, error: providerError } = await supabase
            .from('providers')
            .select('id, name, api_key, api_url')
            .eq('id', serviceWithProvider.provider_id)
            .single();
          
          if (providerError) {
            console.error(`❌ Erro ao buscar provedor para serviço ${serviceWithProvider.id}:`, providerError);
          } else if (provider) {
            console.log('✅ Provedor encontrado!');
            console.log(`- ID: ${provider.id}, Nome: ${provider.name}`);
            console.log(`- API URL: ${provider.api_url || 'N/A'}`);
            console.log(`- API Key: ${provider.api_key ? (provider.api_key.substring(0, 5) + '...') : 'N/A'}`);
          } else {
            console.error(`❌ Provedor com ID ${serviceWithProvider.provider_id} não encontrado`);
          }
        } else {
          console.log('⚠️ Nenhum serviço com provider_id encontrado na amostra');
        }
      }
    }
    
    console.log('\nTeste de conexão concluído!');
  } catch (error) {
    console.error('❌ Erro durante o teste de conexão:', error);
  }
}

// Executar o teste
testSupabaseConnection(); 