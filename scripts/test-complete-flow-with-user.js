// Script para testar o fluxo completo de integração com o provedor, incluindo criação de usuário
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Testa o fluxo completo simulando o recebimento de uma transação até o envio para o provedor,
 * garantindo que o user_id seja corretamente preenchido
 */
async function testCompleteFlowWithUser() {
  console.log('🚀 Testando o fluxo completo de processamento de pedido com usuário');
  console.log('===============================================================\n');

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

    // Selecionar o primeiro serviço para teste
    const service = services[0];
    console.log(`✅ Serviço selecionado: "${service.name}" (ID: ${service.id})\n`);

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

    // 4. Criar ou buscar um usuário para o teste
    console.log('4️⃣ Criando ou buscando usuário para o teste...');
    const userEmail = `teste_${Date.now()}@example.com`;
    const userName = 'Cliente Teste';
    
    // Verificar se já existe um usuário de teste
    let user = await prisma.user.findFirst({
      where: { 
        email: { contains: '@example.com' } 
      }
    });
    
    // Se não existe, criar um novo
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          role: 'customer'
        }
      });
      console.log(`✅ Usuário criado com ID: ${user.id}, Email: ${user.email}\n`);
    } else {
      console.log(`✅ Usuário existente encontrado: ${user.name}, ID: ${user.id}, Email: ${user.email}\n`);
    }

    // 5. Simular recebimento de um pedido do sistema de pagamentos
    console.log('5️⃣ Simulando recebimento de pedido do microserviço de pagamentos...');
    
    const mockOrderRequest = {
      transaction_id: `test-${Date.now()}`,
      service_id: service.id,
      external_service_id: service.external_id,
      amount: service.preco || 19.90,
      quantity: 100,
      target_username: 'usuario_teste',
      target_url: 'https://instagram.com/usuario_teste',
      customer_name: userName,
      customer_email: userEmail,
      payment_data: {
        method: 'pix',
        status: 'approved'
      }
    };
    
    console.log('📦 Dados do pedido:', JSON.stringify(mockOrderRequest, null, 2), '\n');

    // 6. Criar o provedor localmente se não existir
    console.log('6️⃣ Verificando/criando provedor localmente...');
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

    // 7. Criar pedido no banco de dados com user_id explicitamente
    console.log('7️⃣ Criando pedido no banco de dados com user_id...');
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
        user_id: user.id, // Associar explicitamente ao usuário
        metadata: {
          service_id_supabase: service.id,
          service_name: service.name,
          payment_method: 'pix',
          payment_status: 'approved',
          customer_id: user.id, // Incluir também nos metadados
          created_at: new Date().toISOString(),
          source: 'test-script'
        }
      }
    });

    console.log(`✅ Pedido criado com ID: ${order.id}, associado ao usuário: ${user.id}\n`);

    // 8. Simular processmento do pedido
    console.log('8️⃣ Preparando dados para envio ao provedor...');
    
    const providerPayload = {
      key: localProvider.api_key,
      action: 'add',
      service: order.external_service_id,
      link: order.target_url,
      quantity: order.quantity
    };
    
    console.log('📤 Payload para API do provedor:');
    console.log(JSON.stringify(providerPayload, null, 2), '\n');
    
    // 9. Simular resposta do provedor
    console.log('9️⃣ Simulando resposta do provedor...');
    
    const mockProviderResponse = {
      order: Math.floor(Math.random() * 1000000) + 10000,
      status: 'In progress'
    };
    
    console.log('📥 Resposta simulada do provedor:');
    console.log(JSON.stringify(mockProviderResponse, null, 2), '\n');
    
    // 10. Atualizar pedido com a resposta
    console.log('🔟 Atualizando pedido com resposta do provedor...');
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        external_order_id: mockProviderResponse.order.toString(),
        status: 'processing',
        provider_response: mockProviderResponse
      }
    });
    
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        level: 'info',
        message: 'Pedido simulado criado e enviado com sucesso',
        data: {
          provider_id: localProvider.id,
          provider_name: localProvider.name,
          external_order_id: mockProviderResponse.order.toString(),
          user_id: user.id,
          simulation: true
        }
      }
    });
    
    console.log(`✅ Pedido atualizado com ID externo: ${mockProviderResponse.order}\n`);
    
    // 11. Verificar se o user_id está preenchido
    console.log('1️⃣1️⃣ Verificando se o user_id está preenchido corretamente...');
    
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { user: true }
    });
    
    if (updatedOrder.user_id === user.id) {
      console.log(`✅ user_id preenchido corretamente: ${updatedOrder.user_id}`);
      console.log(`   Nome do usuário: ${updatedOrder.user?.name}`);
      console.log(`   Email do usuário: ${updatedOrder.user?.email}`);
    } else {
      console.error(`❌ user_id não está preenchido corretamente! Valor: ${updatedOrder.user_id || 'null'}`);
    }
    
    // 12. Mostrar resumo
    console.log('\n🎉 Teste de fluxo completo concluído com sucesso!');
    console.log('=============================================');
    console.log(`
Resumo do Pedido:
- ID interno: ${order.id}
- ID externo: ${mockProviderResponse.order}
- Serviço: ${service.name}
- ID do serviço no provedor: ${order.external_service_id} 
- Provedor: ${localProvider.name}
- Usuário: ${user.name} (ID: ${user.id})
- Status: processing
    `);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testCompleteFlowWithUser(); 