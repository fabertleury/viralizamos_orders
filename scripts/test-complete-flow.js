// Script para testar o fluxo completo de integração com o provedor
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Testa o fluxo completo simulando o recebimento de uma transação até o envio para o provedor
 */
async function testCompleteFlow() {
  console.log('🚀 Testando o fluxo completo de processamento de pedido');
  console.log('======================================================\n');

  try {
    // 1. Conectar ao Supabase
    console.log('1️⃣ Conectando ao Supabase...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Conexão com Supabase estabelecida\n');

    // 2. Buscar um serviço ativo no Supabase
    console.log('2️⃣ Buscando um serviço ativo no Supabase...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, provider_id, external_id, preco')
      .eq('status', true)
      .limit(5);

    if (servicesError || !services || services.length === 0) {
      throw new Error('Não foi possível encontrar serviços no Supabase: ' + 
        (servicesError ? servicesError.message : 'Nenhum serviço encontrado'));
    }

    // Exibir serviços encontrados para seleção
    console.log('Serviços disponíveis:');
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} (ID: ${service.id}, ID Externo: ${service.external_id})`);
    });

    // Selecionar o primeiro serviço para teste
    const selectedServiceIndex = 0;
    const service = services[selectedServiceIndex];
    console.log(`\n✅ Serviço selecionado: "${service.name}" (ID: ${service.id})\n`);

    // 3. Buscar informações do provedor do serviço
    console.log('3️⃣ Buscando provedor do serviço...');
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', service.provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Não foi possível encontrar o provedor com ID: ' + service.provider_id);
    }

    console.log(`✅ Provedor encontrado: "${provider.name}" (${provider.api_url})\n`);

    // 4. Simular recebimento de um pedido do sistema de pagamentos
    console.log('4️⃣ Simulando recebimento de pedido do microserviço de pagamentos...');
    
    const mockOrderRequest = {
      transaction_id: `test-${Date.now()}`,
      service_id: service.id,
      external_service_id: service.external_id,
      amount: service.preco || 19.90,
      quantity: 100,
      target_username: 'usuario_teste',
      target_url: 'https://instagram.com/usuario_teste',
      customer_name: 'Cliente Teste',
      customer_email: 'cliente@teste.com',
      payment_data: {
        method: 'pix',
        status: 'approved'
      }
    };
    
    console.log('📦 Dados do pedido:', JSON.stringify(mockOrderRequest, null, 2), '\n');

    // 5. Criar o provedor localmente se não existir
    console.log('5️⃣ Verificando/criando provedor localmente...');
    let localProvider = await prisma.provider.findUnique({
      where: { id: provider.id }
    });

    if (!localProvider) {
      localProvider = await prisma.provider.create({
        data: {
          id: provider.id,
          name: provider.name,
          slug: provider.name.toLowerCase().replace(/\s+/g, '-'),
          api_key: provider.api_key,
          api_url: provider.api_url,
          status: true
        }
      });
      console.log(`✅ Provedor "${provider.name}" criado localmente\n`);
    } else {
      console.log(`✅ Provedor "${provider.name}" já existe localmente\n`);
    }

    // 6. Criar pedido no banco de dados
    console.log('6️⃣ Criando pedido no banco de dados...');
    const order = await prisma.order.create({
      data: {
        transaction_id: mockOrderRequest.transaction_id,
        external_service_id: mockOrderRequest.external_service_id,
        provider_id: localProvider.id,
        status: 'pending',
        amount: mockOrderRequest.amount,
        quantity: mockOrderRequest.quantity,
        target_username: mockOrderRequest.target_username,
        target_url: mockOrderRequest.target_url,
        customer_name: mockOrderRequest.customer_name,
        customer_email: mockOrderRequest.customer_email,
        metadata: {
          service_id_supabase: service.id,
          service_name: service.name,
          payment_method: 'pix',
          payment_status: 'approved',
          created_at: new Date().toISOString(),
          source: 'test-script'
        }
      }
    });

    console.log(`✅ Pedido criado com ID: ${order.id}\n`);

    // 7. Simular processmento do pedido (montagem do payload)
    console.log('7️⃣ Preparando dados para envio ao provedor...');
    
    const providerPayload = {
      key: localProvider.api_key,
      action: 'add',
      service: order.external_service_id,
      link: order.target_url,
      quantity: order.quantity
    };
    
    console.log('📤 Payload para API do provedor:');
    console.log(JSON.stringify(providerPayload, null, 2), '\n');
    
    // 8. Simular chamada para API do provedor (sem fazer o request HTTP real)
    console.log('8️⃣ Simulando resposta do provedor...');
    
    // Simular resposta da API (sem fazer chamada real)
    const mockProviderResponse = {
      order: Math.floor(Math.random() * 1000000) + 10000,
      status: 'In progress'
    };
    
    console.log('📥 Resposta simulada do provedor:');
    console.log(JSON.stringify(mockProviderResponse, null, 2), '\n');
    
    // 9. Atualizar pedido com informações da resposta
    console.log('9️⃣ Atualizando pedido com resposta do provedor...');
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        external_order_id: mockProviderResponse.order.toString(),
        status: 'processing',
        provider_response: mockProviderResponse
      }
    });
    
    // 10. Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        level: 'info',
        message: 'Pedido simulado criado e enviado com sucesso',
        data: {
          provider_id: localProvider.id,
          provider_name: localProvider.name,
          external_order_id: mockProviderResponse.order.toString(),
          simulation: true
        }
      }
    });
    
    console.log(`✅ Pedido atualizado com ID externo: ${mockProviderResponse.order}\n`);
    
    // 11. Mostrar resumo
    console.log('🎉 Teste de fluxo completo concluído com sucesso!');
    console.log('=============================================');
    console.log(`
Resumo do Pedido:
- ID interno: ${order.id}
- ID externo: ${mockProviderResponse.order}
- Serviço: ${service.name} (ID: ${service.id})
- ID do serviço no provedor: ${order.external_service_id} 
- Provedor: ${localProvider.name}
- Usuário alvo: ${order.target_username}
- Quantidade: ${order.quantity}
- Status: processing

Detalhes do Provedor:
- Nome: ${localProvider.name} 
- URL da API: ${localProvider.api_url}
- Chave da API: ${localProvider.api_key ? (localProvider.api_key.substring(0, 5) + '...') : 'N/A'}
    `);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testCompleteFlow(); 