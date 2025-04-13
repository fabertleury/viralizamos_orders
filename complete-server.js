/**
 * Servidor completo para o microserviço de orders
 * Implementa todas as funcionalidades necessárias para processar pedidos
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const axios = require('axios');

// Inicializar o cliente Prisma
const prisma = new PrismaClient();

// Configurar cliente Supabase para buscar informações de serviços
let supabaseClient = null;

// Função para criar o cliente Supabase
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://wuwkcnimoilcnuxwwnqz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseKey) {
    console.warn('SUPABASE_SERVICE_KEY não definida. Funcionalidades de integração com Supabase serão limitadas.');
    return null;
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  console.log('Cliente Supabase inicializado');
  return supabaseClient;
}

// Função para buscar informações do serviço no Supabase
async function fetchServiceInfo(serviceId) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn(`Não foi possível buscar informações do serviço ${serviceId}: Cliente Supabase não inicializado`);
      return null;
    }
    
    console.log(`Buscando informações do serviço ${serviceId} no Supabase`);
    
    // Buscar o serviço com informações do provedor
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
      console.error(`Erro ao buscar serviço ${serviceId}:`, error);
      return null;
    }
    
    if (!service) {
      console.warn(`Serviço ${serviceId} não encontrado no Supabase`);
      return null;
    }
    
    console.log(`Serviço encontrado: ${service.name}, Provedor: ${service.provider?.name || 'Não definido'}`);
    
    return {
      service,
      provider: service.provider || null,
      external_service_id: service.external_id || null
    };
  } catch (error) {
    console.error('Erro ao buscar informações do serviço:', error);
    return null;
  }
}

// Configuração
const PORT = process.env.PORT || 4000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rota de healthcheck
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// Função para aplicar correções no banco de dados
async function applyDatabaseCorrections() {
  console.log('Aplicando correções no banco de dados...');
  
  try {
    // Remover constraint foreign key problemática
    await prisma.$executeRaw`ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_serviceId_fkey"`;
    console.log('Constraint de chave estrangeira removida com sucesso (ou já não existia).');
    
    // Não vamos mais verificar ou criar o serviço 'viralizamos' no banco local
    // já que os serviços são acessados diretamente do Supabase
    
    return true;
  } catch (error) {
    console.error('Erro ao aplicar correções no banco de dados:', error);
    throw error;
  }
}

// Função para enviar pedido ao provedor
async function sendOrderToProvider(order) {
  try {
    // Verificar se temos todas as informações necessárias
    if (!order.provider_id || !order.external_service_id) {
      console.error(`Não é possível enviar pedido ${order.id} ao provedor: dados incompletos`);
      return {
        success: false,
        error: 'Dados de provedor ou serviço incompletos'
      };
    }
    
    // Buscar informações do provedor no banco de dados
    const provider = await prisma.provider.findUnique({
      where: { id: order.provider_id }
    });
    
    if (!provider) {
      console.error(`Provedor ${order.provider_id} não encontrado`);
      return {
        success: false,
        error: 'Provedor não encontrado'
      };
    }
    
    // Se não temos a URL da API ou chave, buscar no Supabase
    if (!provider.api_url || !provider.api_key) {
      console.log(`Informações de API incompletas para o provedor ${provider.id}, buscando no Supabase...`);
      
      // Buscar no Supabase se as informações estiverem incompletas
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: providerData, error } = await supabase
          .from('providers')
          .select('*')
          .eq('id', provider.id)
          .single();
          
        if (!error && providerData) {
          provider.api_url = providerData.api_url;
          provider.api_key = providerData.api_key;
        }
      }
    }
    
    if (!provider.api_url || !provider.api_key) {
      console.error(`Não é possível enviar pedido: API URL ou chave do provedor não disponíveis`);
      return {
        success: false,
        error: 'API URL ou chave do provedor não disponíveis'
      };
    }
    
    // Preparar os dados para o provedor
    const payload = {
      key: provider.api_key,
      action: 'add',
      service: order.external_service_id,
      link: order.target_url,
      quantity: order.quantity
    };
    
    console.log(`Enviando pedido ao provedor (${provider.name}):`);
    console.log('URL da API:', provider.api_url);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Enviar para o provedor
    const response = await axios.post(provider.api_url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Resposta do provedor:', JSON.stringify(response.data, null, 2));
    
    // Atualizar o pedido com a resposta do provedor
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'processing',
        provider_response: response.data
      }
    });
    
    // Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        message: 'Pedido enviado ao provedor',
        level: 'info',
        data: {
          provider_response: response.data,
          provider_request: payload
        }
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`Erro ao enviar pedido ${order.id} ao provedor:`, error);
    
    // Registrar o erro
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        message: `Erro ao enviar pedido ao provedor: ${error.message}`,
        level: 'error',
        data: { error: error.message, stack: error.stack }
      }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Rota para criar pedidos
app.post('/api/orders/create', async (req, res) => {
  console.log('Recebido pedido para criar ordem:', JSON.stringify(req.body, null, 2));
  
  try {
    // Verificar formato da requisição - pode vir como { order: {...} } ou diretamente {...}
    const orderData = req.body.order || req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Dados de ordem não fornecidos' });
    }
    
    console.log('Processando dados de ordem:', JSON.stringify(orderData, null, 2));
    
    // Verificar se o transaction_id existe para evitar duplicidade
    if (orderData.transaction_id) {
      console.log(`Verificando se já existe pedido com transaction_id: ${orderData.transaction_id}`);
      
      // Verificar se já existe pedido com o mesmo external_order_id (exato)
      if (orderData.external_order_id) {
        const existingExactOrder = await prisma.order.findFirst({
          where: { external_order_id: orderData.external_order_id }
        });
        
        if (existingExactOrder) {
          console.log(`Pedido com external_order_id ${orderData.external_order_id} já existe. ID: ${existingExactOrder.id}`);
          return res.status(200).json({ 
            success: true, 
            message: 'Pedido já processado anteriormente',
            order: existingExactOrder,
            is_duplicate: true
          });
        }
      }
    }
    
    // Buscar informações do serviço e provedor se não estiverem disponíveis
    let providerInfo = null;
    let externalServiceId = orderData.external_service_id;
    let providerId = orderData.provider_id;
    
    // Se temos service_id mas falta provider_id ou external_service_id, buscar no Supabase
    if (orderData.service_id && (!providerId || !externalServiceId)) {
      console.log(`Buscando informações complementares para o serviço ${orderData.service_id}`);
      
      const serviceInfo = await fetchServiceInfo(orderData.service_id);
      if (serviceInfo) {
        providerInfo = serviceInfo.provider;
        
        if (!providerId && providerInfo) {
          providerId = providerInfo.id;
          console.log(`Provider ID obtido do Supabase: ${providerId}`);
        }
        
        if (!externalServiceId) {
          externalServiceId = serviceInfo.external_service_id;
          console.log(`External Service ID obtido do Supabase: ${externalServiceId}`);
        }
      }
    }
    
    // Extrair informações do post_data, se disponível
    const postData = orderData.post_data || {};
    const paymentData = orderData.payment_data || {};
    
    // Se houver múltiplos posts, criar uma ordem para cada um
    if (orderData.posts && Array.isArray(orderData.posts) && orderData.posts.length > 0) {
      console.log(`Processando ${orderData.posts.length} posts individuais`);
      
      const createdOrders = [];
      
      for (const post of orderData.posts) {
        // Preparar dados do post para salvar como metadata
        const postInfo = {
          post_id: post.id || post.post_id,
          post_url: post.url || post.post_url,
          post_type: post.type || post.post_type || 'post',
          post_code: post.code || post.post_code,
          is_reel: post.is_reel || false
        };
        
        // Criar o pedido
        const createdOrder = await prisma.order.create({
          data: {
            transaction_id: orderData.transaction_id || `tx-${Date.now()}`,
            service_id: orderData.service_id,
            external_service_id: externalServiceId,
            external_order_id: orderData.external_order_id,
            provider_id: providerId,
            status: 'pending',
            amount: orderData.amount || 0,
            quantity: orderData.quantity || 0,
            target_username: orderData.target_username || '',
            target_url: post.url || postData.post_url || orderData.target_url || '',
            customer_name: orderData.customer_name || '',
            customer_email: orderData.customer_email || '',
            metadata: {
              post: postInfo,
              payment: paymentData,
              external_payment_id: orderData.external_payment_id,
              external_transaction_id: orderData.external_transaction_id,
              service_info: providerInfo ? {
                name: providerInfo.name,
                provider_name: providerInfo.name,
                provider_slug: providerInfo.slug
              } : undefined
            }
          }
        });
        
        // Criar log da ordem
        await prisma.orderLog.create({
          data: {
            order_id: createdOrder.id,
            message: 'Ordem criada com sucesso',
            level: 'info',
            data: { 
              source: 'api', 
              method: 'POST /api/orders/create',
              provider_id: providerId,
              external_service_id: externalServiceId
            }
          }
        });
        
        createdOrders.push(createdOrder);
        console.log(`Ordem criada com ID: ${createdOrder.id}`);
      }
      
      return res.status(201).json({ success: true, orders: createdOrders });
    } else {
      // Preparar dados do post, se disponíveis
      const postInfo = postData ? {
        post_id: postData.post_id,
        post_url: postData.post_url,
        post_type: postData.post_type || 'post',
        post_code: postData.post_code,
        is_reel: postData.is_reel || false
      } : {};
      
      // Processar como uma única ordem
      console.log(`Criando ordem única para transaction_id: ${orderData.transaction_id}`);
      
      const createdOrder = await prisma.order.create({
        data: {
          transaction_id: orderData.transaction_id || `tx-${Date.now()}`,
          service_id: orderData.service_id,
          external_service_id: externalServiceId,
          external_order_id: orderData.external_order_id,
          provider_id: providerId,
          status: 'pending',
          amount: orderData.amount || 0,
          quantity: orderData.quantity || 0,
          target_username: orderData.target_username || '',
          target_url: postData.post_url || orderData.target_url || '',
          customer_name: orderData.customer_name || '',
          customer_email: orderData.customer_email || '',
          metadata: {
            post: postInfo,
            payment: paymentData,
            external_payment_id: orderData.external_payment_id,
            external_transaction_id: orderData.external_transaction_id,
            transaction_id: orderData.transaction_id, // Duplicar para facilitar consultas
            service_info: providerInfo ? {
              name: providerInfo.name,
              provider_name: providerInfo.name,
              provider_slug: providerInfo.slug
            } : undefined
          }
        }
      });
      
      // Criar log da ordem
      await prisma.orderLog.create({
        data: {
          order_id: createdOrder.id,
          message: 'Ordem criada com sucesso',
          level: 'info',
          data: { 
            source: 'api', 
            method: 'POST /api/orders/create',
            provider_id: providerId,
            external_service_id: externalServiceId
          }
        }
      });
      
      console.log(`Ordem única criada com ID: ${createdOrder.id}`);
      return res.status(201).json({ success: true, order: createdOrder });
    }
  } catch (error) {
    console.error('Erro ao criar ordem:', error);
    return res.status(500).json({ error: 'Erro ao processar a ordem', details: error.message });
  }
});

// Rota para verificar status de um pedido
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        logs: {
          orderBy: { created_at: 'desc' },
          take: 10
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error('Erro ao consultar pedido:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota para listar pedidos por transaction_id
app.get('/api/orders/by-transaction/:transactionId', async (req, res) => {
  try {
    const transactionId = req.params.transactionId;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'ID da transação não fornecido'
      });
    }
    
    console.log(`Buscando pedidos para transaction_id: ${transactionId}`);
    
    const orders = await prisma.order.findMany({
      where: { transaction_id: transactionId },
      include: {
        logs: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`Encontrados ${orders.length} pedidos para transaction_id ${transactionId}`);
    
    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
    
  } catch (error) {
    console.error('Erro ao consultar pedidos por transaction_id:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota raiz para informações da API
app.get(['/', '/api'], (req, res) => {
  res.status(200).json({
    message: 'Viralizamos Orders API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      { path: '/health', method: 'GET', description: 'Verificação de saúde' },
      { path: '/api/orders/create', method: 'POST', description: 'Criar novos pedidos' },
      { path: '/api/orders/:id', method: 'GET', description: 'Consultar status de um pedido' },
      { path: '/api/orders/by-transaction/:transactionId', method: 'GET', description: 'Consultar pedidos por transaction_id' },
      { path: '/api/orders/:id/process', method: 'POST', description: 'Processar um pedido específico (enviar ao provedor)' },
      { path: '/api/orders/process-by-transaction/:transactionId', method: 'POST', description: 'Processar todos os pedidos pendentes de uma transação' }
    ]
  });
});

// Rota para processar um pedido específico
app.post('/api/orders/:id/process', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }
    
    // Verificar se o pedido já foi processado
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Pedido não pode ser processado, status atual: ${order.status}`
      });
    }
    
    // Enviar pedido ao provedor
    const result = await sendOrderToProvider(order);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Pedido enviado ao provedor com sucesso',
        order_id: order.id,
        provider_response: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        order_id: order.id
      });
    }
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota para processar todos os pedidos pendentes de uma transação
app.post('/api/orders/process-by-transaction/:transactionId', async (req, res) => {
  try {
    const transactionId = req.params.transactionId;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'ID da transação não fornecido'
      });
    }
    
    // Buscar todos os pedidos pendentes da transação
    const pendingOrders = await prisma.order.findMany({
      where: { 
        transaction_id: transactionId,
        status: 'pending'
      }
    });
    
    if (pendingOrders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum pedido pendente encontrado para esta transação'
      });
    }
    
    console.log(`Processando ${pendingOrders.length} pedidos pendentes para transaction_id ${transactionId}`);
    
    const results = [];
    
    // Processar cada pedido com um intervalo de tempo entre eles
    for (let i = 0; i < pendingOrders.length; i++) {
      const order = pendingOrders[i];
      
      // Se não for o primeiro pedido, aguardar um tempo para não sobrecarregar o provedor
      if (i > 0) {
        const delayMs = 5000; // 5 segundos entre cada pedido
        console.log(`Aguardando ${delayMs}ms antes de processar o próximo pedido...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log(`Processando pedido ${i+1}/${pendingOrders.length}: ${order.id}`);
      const result = await sendOrderToProvider(order);
      
      results.push({
        order_id: order.id,
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error
      });
    }
    
    return res.status(200).json({
      success: true,
      processed_count: results.length,
      results
    });
  } catch (error) {
    console.error('Erro ao processar pedidos da transação:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Handler para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint não encontrado'
  });
});

// Handler para erros internos
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Função principal para inicializar o servidor
async function initializeServer() {
  try {
    // Verificar conexão com o banco de dados
    await prisma.$connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Aplicar correções no banco de dados
    await applyDatabaseCorrections();
    console.log('Correções no banco de dados aplicadas com sucesso.');
    
    // Iniciar o servidor HTTP
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor completo iniciado e escutando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro crítico durante a inicialização do servidor:', error);
    process.exit(1); // Encerrar o processo com código de erro
  }
}

// Iniciar o servidor
initializeServer();

// Gerenciar encerramento limpo
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Desconexão do Prisma realizada. Encerrando processo.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Desconexão do Prisma realizada. Encerrando processo.');
  process.exit(0);
}); 