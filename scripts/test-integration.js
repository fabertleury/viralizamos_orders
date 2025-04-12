// Script para testar a integração entre os microserviços
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();

// Função para simular o recebimento de um pedido do microserviço de pagamentos
async function testIntegrationFlow() {
  console.log('🚀 Iniciando teste de integração do fluxo completo');
  console.log('==================================================\n');

  try {
    // 1. Criar conexão com Supabase
    console.log('1️⃣ Conectando ao Supabase...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Conexão com Supabase estabelecida\n');

    // 2. Buscar um serviço existente no Supabase para usar no teste
    console.log('2️⃣ Buscando um serviço no Supabase...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, provider_id, external_id, preco')
      .eq('status', true)
      .limit(1);

    if (servicesError || !services || services.length === 0) {
      throw new Error('Não foi possível encontrar serviços no Supabase: ' + 
        (servicesError ? servicesError.message : 'Nenhum serviço encontrado'));
    }

    const service = services[0];
    console.log(`✅ Serviço encontrado: "${service.name}" (ID: ${service.id})\n`);

    // 3. Buscar o provedor associado ao serviço
    console.log('3️⃣ Buscando o provedor associado ao serviço...');
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', service.provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Não foi possível encontrar o provedor com ID: ' + service.provider_id);
    }

    console.log(`✅ Provedor encontrado: "${provider.name}"\n`);

    // 4. Simular recebimento de uma transação aprovada do microserviço de pagamentos
    console.log('4️⃣ Simulando recebimento de transação aprovada...');
    const mockTransaction = {
      id: 'mock-transaction-' + Date.now(),
      status: 'approved',
      amount: service.preco || 29.90,
      method: 'pix',
      created_at: new Date()
    };

    const mockOrderData = {
      transaction_id: mockTransaction.id,
      service_id: service.id,
      external_service_id: service.external_id,
      amount: mockTransaction.amount,
      quantity: 100,
      target_username: 'usuario_teste',
      target_url: 'https://instagram.com/usuario_teste',
      customer_name: 'Cliente Teste',
      customer_email: 'cliente@teste.com',
      payment_data: {
        method: mockTransaction.method,
        status: mockTransaction.status
      }
    };

    console.log('📦 Dados do pedido:', JSON.stringify(mockOrderData, null, 2), '\n');

    // 5. Criar provedor localmente (se não existir)
    console.log('5️⃣ Criando ou verificando provedor localmente...');
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

    // 6. Criar pedido no sistema
    console.log('6️⃣ Criando pedido no sistema...');
    const order = await prisma.order.create({
      data: {
        transaction_id: mockOrderData.transaction_id,
        service_id: mockOrderData.service_id,
        external_service_id: mockOrderData.external_service_id,
        provider_id: localProvider.id,
        status: 'pending',
        amount: mockOrderData.amount,
        quantity: mockOrderData.quantity,
        target_username: mockOrderData.target_username,
        target_url: mockOrderData.target_url,
        customer_name: mockOrderData.customer_name,
        customer_email: mockOrderData.customer_email,
        metadata: {
          payment_method: mockOrderData.payment_data.method,
          payment_status: mockOrderData.payment_data.status,
          created_at: new Date().toISOString(),
          source: 'integration-test'
        }
      }
    });

    console.log(`✅ Pedido criado com ID: ${order.id}\n`);

    // 7. Simular a invocação da API do provedor (sem realmente fazer a chamada)
    console.log('7️⃣ Simulando envio para o provedor...');
    console.log('📤 Dados que seriam enviados ao provedor:');
    
    const providerPayload = {
      key: localProvider.api_key,
      action: 'add',
      service: mockOrderData.external_service_id,
      link: mockOrderData.target_url,
      quantity: mockOrderData.quantity
    };
    
    console.log(JSON.stringify(providerPayload, null, 2), '\n');

    // 8. Atualizar o pedido com um ID de pedido externo simulado
    console.log('8️⃣ Simulando resposta do provedor e atualizando pedido...');
    const mockProviderResponse = {
      order: Math.floor(Math.random() * 1000000) + 10000, // ID simulado do pedido no provedor
      status: 'processing'
    };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        external_order_id: mockProviderResponse.order.toString(),
        status: 'processing',
        provider_response: mockProviderResponse
      }
    });

    console.log(`✅ Pedido atualizado com ID externo: ${mockProviderResponse.order}\n`);

    // 9. Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        level: 'info',
        message: 'Pedido de teste processado com sucesso',
        data: {
          provider_id: localProvider.id,
          provider_name: localProvider.name,
          external_order_id: mockProviderResponse.order.toString(),
          simulation: true
        }
      }
    });

    console.log('🎉 Teste de integração concluído com sucesso!');
    console.log('============================================');
    console.log(`
Resumo:
- Serviço: ${service.name} (ID: ${service.id})
- Provedor: ${provider.name} (ID: ${provider.id})
- Pedido interno: ${order.id}
- Pedido externo: ${mockProviderResponse.order}
- Status: processing
    `);

  } catch (error) {
    console.error('❌ Erro durante o teste de integração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testIntegrationFlow(); 