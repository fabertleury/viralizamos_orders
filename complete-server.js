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

// Cache para rastrear posts por transação
const transactionPostsCache = new Map();

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

// Após a função fetchServiceInfo, adicionar função de utilidade para garantir que valores sejam strings

/**
 * Converte um valor para string, garantindo que o resultado não seja undefined ou null
 * @param {any} value - Valor a ser convertido para string
 * @param {string} defaultValue - Valor padrão se for undefined ou null
 * @returns {string} - O valor convertido para string
 */
function ensureString(value, defaultValue = '') {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return String(value);
}

// Após a função fetchServiceInfo, adicionar função para buscar provedor pelo service_id no banco local

/**
 * Buscar provedor associado a um serviço pelo ID diretamente no banco local
 * Esta é uma função alternativa quando o Supabase falha
 */
async function getProviderByServiceId(serviceId) {
  try {
    console.log(`[Fallback] Buscando provedor para serviço ${serviceId} no banco local...`);
    
    // Buscar service e provider através de um pedido existente para este serviço
    const existingOrder = await prisma.order.findFirst({
      where: {
        service_id: serviceId,
        provider_id: { not: null }
      },
      select: {
        provider_id: true,
        external_service_id: true
      }
    });
    
    if (existingOrder && existingOrder.provider_id) {
      console.log(`[Fallback] Encontrado provedor ${existingOrder.provider_id} de pedido existente`);
      
      // Buscar detalhes completos do provedor
      const provider = await prisma.provider.findUnique({
        where: { id: existingOrder.provider_id }
      });
      
      if (provider) {
        return {
          provider_id: provider.id,
          external_service_id: existingOrder.external_service_id,
          provider: provider
        };
      }
    }
    
    console.log('[Fallback] Nenhum provedor encontrado para este serviço no banco local');
    return null;
  } catch (error) {
    console.error('[Fallback] Erro ao buscar provedor no banco local:', error);
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
      },
      timeout: 30000 // 30 segundos timeout
    });
    
    console.log('Resposta do provedor:', JSON.stringify(response.data, null, 2));
    
    // Extrair detalhes da resposta
    let externalOrderId = null;
    let providerStatus = 'processing';
    let detailedResponse = {};
    
    try {
      // Tentar extrair informações relevantes com base nos formatos de resposta dos provedores comuns
      if (response.data) {
        // Formato comum: { order: "12345" }
        if (response.data.order) {
          externalOrderId = response.data.order;
        }
        // Formato comum: { id: "12345" }
        else if (response.data.id) {
          externalOrderId = response.data.id;
        }
        // Formato comum: { data: { id: "12345" } }
        else if (response.data.data && response.data.data.id) {
          externalOrderId = response.data.data.id;
        }
        
        // Verificar status da resposta
        if (response.data.status) {
          providerStatus = response.data.status.toLowerCase();
        } else if (response.data.data && response.data.data.status) {
          providerStatus = response.data.data.status.toLowerCase();
        }
        
        // Mapear status do provedor para o nosso sistema
        if (providerStatus === 'pending' || providerStatus === 'in_progress' || providerStatus === 'processing') {
          providerStatus = 'processing';
        } else if (providerStatus === 'completed' || providerStatus === 'success' || providerStatus === 'done') {
          providerStatus = 'completed';
        } else if (providerStatus === 'cancelled' || providerStatus === 'failed' || providerStatus === 'error') {
          providerStatus = 'failed';
        }
        
        // Armazenar resposta detalhada
        detailedResponse = {
          raw_response: response.data,
          extracted_order_id: externalOrderId,
          provider_status: providerStatus,
          response_time: new Date().toISOString(),
          provider_name: provider.name,
          provider_id: provider.id
        };
      }
    } catch (parseError) {
      console.error('Erro ao analisar resposta do provedor:', parseError);
      detailedResponse.parse_error = parseError.message;
    }
    
    // Atualizar o pedido com a resposta do provedor
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: providerStatus,
        provider_response: detailedResponse,
        external_order_id: externalOrderId ? ensureString(externalOrderId) : order.external_order_id,
        processed: true,
        processed_at: new Date()
      }
    });
    
    // Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        message: `Pedido enviado ao provedor${externalOrderId ? ` com ID externo ${externalOrderId}` : ''}`,
        level: 'info',
        data: {
          provider_response: detailedResponse,
          provider_request: payload
        }
      }
    });
    
    return {
      success: true,
      data: response.data,
      extracted_details: {
        external_order_id: externalOrderId,
        status: providerStatus
      }
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

// Função para rastrear posts recebidos em cada transação
function trackPostForTransaction(transactionId, postIdentifier) {
  if (!transactionId || !postIdentifier) return false;
  
  // Obter ou criar conjunto de posts para esta transação
  let transactionPosts = transactionPostsCache.get(transactionId);
  if (!transactionPosts) {
    transactionPosts = new Set();
    transactionPostsCache.set(transactionId, transactionPosts);
  }
  
  // Verificar se este post já foi processado
  if (transactionPosts.has(postIdentifier)) {
    console.log(`[RASTREAMENTO] Post ${postIdentifier} já processado para transação ${transactionId}. Ignorando.`);
    return true; // Post já existe
  }
  
  // Adicionar este post ao conjunto
  transactionPosts.add(postIdentifier);
  
  // Exibir status atual
  console.log(`[RASTREAMENTO] Transação ${transactionId} agora tem ${transactionPosts.size} posts rastreados: ${Array.from(transactionPosts).join(', ')}`);
  return false; // Post é novo
}

// Função para obter estatísticas de uma transação
function getTransactionStats(transactionId) {
  if (!transactionId) return null;
  
  const transactionPosts = transactionPostsCache.get(transactionId);
  if (!transactionPosts) {
    return { postsCount: 0, posts: [] };
  }
  
  return {
    postsCount: transactionPosts.size,
    posts: Array.from(transactionPosts)
  };
}

// Função para limpar o cache periodicamente
setInterval(() => {
  console.log(`[MANUTENÇÃO] Limpando cache de rastreamento de transações...`);
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  // Remover transações com mais de 1 hora
  let cleaned = 0;
  transactionPostsCache.forEach((_, key) => {
    // Extrair timestamp do ID se possível
    const timestampMatch = key.match(/tx-(\d+)/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      if (now - timestamp > ONE_HOUR) {
        transactionPostsCache.delete(key);
        cleaned++;
      }
    }
  });
  
  if (cleaned > 0) {
    console.log(`[MANUTENÇÃO] ${cleaned} transações antigas removidas do cache.`);
  }
}, 30 * 60 * 1000); // Executar a cada 30 minutos

// Rota para criar pedidos
app.post('/api/orders/create', async (req, res) => {
  console.log('Recebido pedido para criar ordem:', JSON.stringify(req.body, null, 2));
  
  try {
    // Verificar formato da requisição - pode vir como { order: {...} } ou diretamente {...}
    const orderData = req.body.order || req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Dados de ordem não fornecidos' });
    }
    
    // Identificar a transação para rastreamento
    const transactionId = orderData.transaction_id || `tx-${Date.now()}`;
    
    // Identificar o post específico desta requisição
    let postIdentifier = 'unknown';
    if (orderData.post_data && orderData.post_data.post_code) {
      postIdentifier = orderData.post_data.post_code;
    } else if (orderData.target_url) {
      // Extrair código do post da URL se possível
      const codeMatch = orderData.target_url.match(/\/p\/([^/]+)/);
      if (codeMatch) {
        postIdentifier = codeMatch[1];
      } else {
        postIdentifier = orderData.target_url;
      }
    } else if (orderData.external_order_id) {
      postIdentifier = orderData.external_order_id;
    }
    
    // Rastrear este post para a transação
    trackPostForTransaction(transactionId, postIdentifier);
    
    // Obter estatísticas atuais desta transação
    const transactionStats = getTransactionStats(transactionId);
    console.log(`[ESTATÍSTICAS] Transação ${transactionId} tem ${transactionStats.postsCount} posts até agora.`);
    
    console.log('Processando dados de ordem:', JSON.stringify(orderData, null, 2));
    
    // Verificar se o transaction_id existe para evitar duplicidade
    if (orderData.transaction_id) {
      console.log(`Verificando se já existe pedido com transaction_id: ${orderData.transaction_id}`);
      
      // Verificar se este post específico já foi processado
      if (orderData.external_order_id) {
        // Verificar pelo external_order_id (mais específico)
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
      } else if (orderData.post_data && orderData.post_data.post_code) {
        // Verificar pela combinação de transaction_id e post_code
        const existingPostInTransaction = await prisma.order.findFirst({
          where: { 
            transaction_id: orderData.transaction_id,
            metadata: {
              path: ['post', 'post_code'],
              equals: orderData.post_data.post_code
            }
          }
        });
        
        if (existingPostInTransaction) {
          console.log(`Post ${orderData.post_data.post_code} já foi processado para esta transação. ID: ${existingPostInTransaction.id}`);
          return res.status(200).json({ 
            success: true, 
            message: 'Post já processado para esta transação',
            order: existingPostInTransaction,
            is_duplicate: true
          });
        }
      } else if (orderData.target_url) {
        // Verificar pela combinação de transaction_id e target_url
        const existingUrlInTransaction = await prisma.order.findFirst({
          where: { 
            transaction_id: orderData.transaction_id,
            target_url: orderData.target_url
          }
        });
        
        if (existingUrlInTransaction) {
          console.log(`URL ${orderData.target_url} já foi processada para esta transação. ID: ${existingUrlInTransaction.id}`);
          return res.status(200).json({ 
            success: true, 
            message: 'URL já processada para esta transação',
            order: existingUrlInTransaction,
            is_duplicate: true
          });
        }
      }
      
      // Se chegou aqui, este post ainda não foi processado para esta transação
      console.log(`Nenhum pedido duplicado encontrado para este post na transação ${orderData.transaction_id}`);
    }
    
    // Buscar ou criar usuário com base no email
    let userId = null;
    
    if (orderData.customer_email) {
      // Verificar se o usuário já existe pelo email
      const existingUser = await prisma.user.findFirst({
        where: { email: orderData.customer_email }
      });
      
      if (existingUser) {
        console.log(`Usuário existente encontrado com email ${orderData.customer_email}, ID: ${existingUser.id}`);
        userId = existingUser.id;
      } else {
        // Criar novo usuário
        console.log(`Criando novo usuário com email ${orderData.customer_email}`);
        
        const newUser = await prisma.user.create({
          data: {
            email: orderData.customer_email,
            name: orderData.customer_name || 'Cliente',
            phone: orderData.customer_phone || null,
            role: 'customer'
          }
        });
        
        console.log(`Novo usuário criado com ID: ${newUser.id}`);
        userId = newUser.id;
      }
    }
    
    // Buscar informações do serviço e provedor se não estiverem disponíveis
    let providerInfo = null;
    let externalServiceId = orderData.external_service_id;
    let providerId = orderData.provider_id;
    
    // Se temos service_id mas falta provider_id ou external_service_id, buscar no Supabase
    if (orderData.service_id && (!providerId || !externalServiceId)) {
      console.log(`Buscando informações complementares para o serviço ${orderData.service_id}`);
      
      let foundServiceInfo = false;
      
      // Primeiro tentar no Supabase
      try {
        const serviceInfo = await fetchServiceInfo(orderData.service_id);
        if (serviceInfo) {
          foundServiceInfo = true;
          providerInfo = serviceInfo.provider;
          
          if (!providerId && providerInfo) {
            providerId = providerInfo.id;
            console.log(`Provider ID obtido do Supabase: ${providerId}`);
            
            // Verificar se o provedor existe no banco local
            const existingProvider = await prisma.provider.findUnique({
              where: { id: providerId }
            });
            
            // Se o provedor não existir, criar automaticamente
            if (!existingProvider && providerInfo) {
              console.log(`Provedor não encontrado no banco local. Criando provedor com ID ${providerId}...`);
              try {
                // Remover a constraint de chave estrangeira temporariamente
                await prisma.$executeRaw`
                  DO $$ 
                  BEGIN
                    -- Verifica se a constraint existe
                    IF EXISTS (
                      SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'Order_provider_id_fkey' 
                      AND table_name = 'Order'
                    ) THEN
                      -- Remove a constraint
                      ALTER TABLE "Order" DROP CONSTRAINT "Order_provider_id_fkey";
                      RAISE NOTICE 'Constraint removida.';
                    ELSE
                      RAISE NOTICE 'Constraint não encontrada.';
                    END IF;
                  END $$;
                `;
                
                // Criar o provedor
                await prisma.provider.create({
                  data: {
                    id: providerId,
                    name: providerInfo.name || 'Provedor',
                    slug: providerInfo.slug || `provider-${Date.now()}`,
                    api_url: providerInfo.api_url || '',
                    api_key: providerInfo.api_key || '',
                    status: true,
                    created_at: new Date(),
                    updated_at: new Date()
                  }
                });
                
                // Recriar a constraint de chave estrangeira
                await prisma.$executeRaw`
                  ALTER TABLE "Order"
                  ADD CONSTRAINT "Order_provider_id_fkey"
                  FOREIGN KEY ("provider_id")
                  REFERENCES "Provider"("id")
                  ON DELETE SET NULL;
                `;
                
                console.log(`Provedor criado com sucesso: ${providerId}`);
              } catch (providerCreateError) {
                console.error(`Erro ao criar provedor: ${providerCreateError.message}`);
                // Se falhar em criar o provedor, não associar ao pedido
                providerId = null;
              }
            }
          }
          
          if (!externalServiceId) {
            externalServiceId = serviceInfo.external_service_id;
            console.log(`External Service ID obtido do Supabase: ${externalServiceId}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar informações do serviço no Supabase: ${error.message}`);
        // Continuar e tentar o método fallback
      }
      
      // Se não conseguiu no Supabase, tentar no banco local
      if (!foundServiceInfo) {
        console.log('Tentando buscar informações no banco de dados local como fallback...');
        
        const fallbackInfo = await getProviderByServiceId(orderData.service_id);
        if (fallbackInfo) {
          foundServiceInfo = true;
          
          if (!providerId) {
            providerId = fallbackInfo.provider_id;
            console.log(`Provider ID obtido do banco local: ${providerId}`);
          }
          
          if (!externalServiceId) {
            externalServiceId = fallbackInfo.external_service_id;
            console.log(`External Service ID obtido do banco local: ${externalServiceId}`);
          }
          
          providerInfo = fallbackInfo.provider;
        }
      }
      
      // Se não encontrou nada, registrar alerta
      if (!foundServiceInfo) {
        console.warn(`⚠️ ALERTA: Não foi possível obter informações para o serviço ${orderData.service_id}`);
        console.warn('O pedido será salvo, mas não poderá ser enviado ao provedor sem essas informações');
      }
    }
    
    // Extrair informações do post_data, se disponível
    const postData = orderData.post_data || {};
    const paymentData = orderData.payment_data || {};
    
    // Converter quantidade para inteiro
    let quantity = 0;
    if (orderData.quantity) {
      // Converter para número primeiro, garantir que é positivo, e então arredondar para o inteiro mais próximo
      // Se for uma string ou outro tipo de dado, Number() tentará converter
      const numQuantity = Number(orderData.quantity);
      
      // Verificar se é um número válido
      if (!isNaN(numQuantity)) {
        // Arredondar para o inteiro mais próximo e garantir que seja positivo
        quantity = Math.max(1, Math.round(Math.abs(numQuantity)));
      } else {
        // Se não for um número válido, usar 1 como valor padrão
        quantity = 1;
      }
      
      console.log(`Quantidade original: ${orderData.quantity}, convertida para: ${quantity}`);
    } else {
      // Se não tiver quantidade definida, usar 1 como padrão
      quantity = 1;
      console.log(`Quantidade não definida, usando valor padrão: ${quantity}`);
    }
    
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
            quantity: quantity,
            target_username: orderData.target_username || '',
            target_url: post.url || postData.post_url || orderData.target_url || '',
            customer_name: orderData.customer_name || '',
            customer_email: orderData.customer_email || '',
            user_id: userId, // Vincular ao usuário
            metadata: {
              post: postInfo,
              payment: paymentData,
              original_quantity: orderData.quantity, // Salvar o valor original para referência
              external_payment_id: orderData.external_payment_id,
              external_transaction_id: orderData.external_transaction_id,
              service_info: providerInfo ? {
                name: providerInfo.name,
                provider_name: providerInfo.name,
                provider_slug: providerInfo.slug
              } : undefined,
              user_info: userId ? {
                user_id: userId,
                email: orderData.customer_email
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
              external_service_id: externalServiceId,
              user_id: userId
            }
          }
        });
        
        createdOrders.push(createdOrder);
        console.log(`Ordem criada com ID: ${createdOrder.id}`);
        
        // Enviar pedido ao provedor
        if (providerId && externalServiceId) {
          try {
            console.log(`Enviando ordem ${createdOrder.id} para o provedor...`);
            const providerResponse = await sendOrderToProvider(createdOrder);
            
            if (providerResponse.success) {
              console.log(`Ordem ${createdOrder.id} enviada com sucesso ao provedor. Resposta:`, JSON.stringify(providerResponse.data, null, 2));
              
              // Atualizar ordem com ID externo se fornecido pelo provedor
              if (providerResponse.data && providerResponse.data.order) {
                await prisma.order.update({
                  where: { id: createdOrder.id },
                  data: {
                    external_order_id: ensureString(providerResponse.data.order),
                    status: 'processing'
                  }
                });
                
                console.log(`Ordem ${createdOrder.id} atualizada com ID externo: ${providerResponse.data.order}`);
              }
            } else {
              console.error(`Falha ao enviar ordem ${createdOrder.id} para o provedor:`, providerResponse.error);
            }
          } catch (providerError) {
            console.error(`Erro ao enviar ordem ${createdOrder.id} para o provedor:`, providerError);
          }
        } else {
          console.warn(`Não foi possível enviar a ordem ${createdOrder.id} ao provedor: providerId ou externalServiceId não disponíveis`);
        }
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
          quantity: quantity,
          target_username: orderData.target_username || '',
          target_url: postData.post_url || orderData.target_url || '',
          customer_name: orderData.customer_name || '',
          customer_email: orderData.customer_email || '',
          user_id: userId, // Vincular ao usuário
          metadata: {
            post: postInfo,
            payment: paymentData,
            original_quantity: orderData.quantity, // Salvar o valor original para referência
            external_payment_id: orderData.external_payment_id,
            external_transaction_id: orderData.external_transaction_id,
            transaction_id: orderData.transaction_id, // Duplicar para facilitar consultas
            service_info: providerInfo ? {
              name: providerInfo.name,
              provider_name: providerInfo.name,
              provider_slug: providerInfo.slug
            } : undefined,
            user_info: userId ? {
              user_id: userId,
              email: orderData.customer_email
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
            external_service_id: externalServiceId,
            user_id: userId
          }
        }
      });
      
      console.log(`Ordem única criada com ID: ${createdOrder.id}`);
      
      // Enviar pedido ao provedor
      if (providerId && externalServiceId) {
        try {
          console.log(`Enviando ordem ${createdOrder.id} para o provedor...`);
          const providerResponse = await sendOrderToProvider(createdOrder);
          
          if (providerResponse.success) {
            console.log(`Ordem ${createdOrder.id} enviada com sucesso ao provedor. Resposta:`, JSON.stringify(providerResponse.data, null, 2));
            
            // Atualizar ordem com ID externo se fornecido pelo provedor
            if (providerResponse.data && providerResponse.data.order) {
              await prisma.order.update({
                where: { id: createdOrder.id },
                data: {
                  external_order_id: ensureString(providerResponse.data.order),
                  status: 'processing'
                }
              });
              
              console.log(`Ordem ${createdOrder.id} atualizada com ID externo: ${providerResponse.data.order}`);
            }
          } else {
            console.error(`Falha ao enviar ordem ${createdOrder.id} para o provedor:`, providerResponse.error);
          }
        } catch (providerError) {
          console.error(`Erro ao enviar ordem ${createdOrder.id} para o provedor:`, providerError);
        }
      } else {
        console.warn(`Não foi possível enviar a ordem ${createdOrder.id} ao provedor: providerId ou externalServiceId não disponíveis`);
      }
      
      return res.status(201).json({ success: true, order: createdOrder });
    }
  } catch (error) {
    console.error('Erro ao criar ordem:', error);
    return res.status(500).json({ error: 'Erro ao processar a ordem', details: error.message });
  }
});

// Após a rota de criar pedidos individuais, adicionar uma rota para processar múltiplos posts em lote
app.post('/api/orders/batch', async (req, res) => {
  console.log('Recebido pedido em lote:', JSON.stringify(req.body, null, 2));
  
  try {
    // Verificar formato da requisição - pode vir como { order: {...} } ou diretamente {...}
    const orderData = req.body.order || req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Dados de ordem não fornecidos' });
    }
    
    // Verificar se existe o array de posts
    if (!orderData.posts || !Array.isArray(orderData.posts) || orderData.posts.length === 0) {
      return res.status(400).json({ error: 'Array de posts não fornecido ou vazio' });
    }
    
    // Identificar a transação para rastreamento
    const transactionId = orderData.transaction_id || `tx-${Date.now()}`;
    console.log(`Processando lote com ${orderData.posts.length} posts para transação ${transactionId}`);
    
    // Buscar ou criar usuário com base no email
    let userId = null;
    
    if (orderData.customer_email) {
      // Verificar se o usuário já existe pelo email
      const existingUser = await prisma.user.findFirst({
        where: { email: orderData.customer_email }
      });
      
      if (existingUser) {
        console.log(`Usuário existente encontrado com email ${orderData.customer_email}, ID: ${existingUser.id}`);
        userId = existingUser.id;
      } else {
        // Criar novo usuário
        console.log(`Criando novo usuário com email ${orderData.customer_email}`);
        
        const newUser = await prisma.user.create({
          data: {
            email: orderData.customer_email,
            name: orderData.customer_name || 'Cliente',
            phone: orderData.customer_phone || null,
            role: 'customer'
          }
        });
        
        console.log(`Novo usuário criado com ID: ${newUser.id}`);
        userId = newUser.id;
      }
    }
    
    // Buscar informações do serviço e provedor se não estiverem disponíveis
    let providerInfo = null;
    let externalServiceId = orderData.external_service_id;
    let providerId = orderData.provider_id;
    
    // Se temos service_id mas falta provider_id ou external_service_id, buscar no Supabase
    if (orderData.service_id && (!providerId || !externalServiceId)) {
      console.log(`Buscando informações complementares para o serviço ${orderData.service_id}`);
      
      let foundServiceInfo = false;
      
      // Primeiro tentar no Supabase
      try {
        const serviceInfo = await fetchServiceInfo(orderData.service_id);
        if (serviceInfo) {
          foundServiceInfo = true;
          providerInfo = serviceInfo.provider;
          
          if (!providerId && providerInfo) {
            providerId = providerInfo.id;
            console.log(`Provider ID obtido do Supabase: ${providerId}`);
            
            // Verificar se o provedor existe no banco local
            const existingProvider = await prisma.provider.findUnique({
              where: { id: providerId }
            });
            
            // Se o provedor não existir, criar automaticamente
            if (!existingProvider && providerInfo) {
              console.log(`Provedor não encontrado no banco local. Criando provedor com ID ${providerId}...`);
              try {
                // Remover a constraint de chave estrangeira temporariamente
                await prisma.$executeRaw`
                  DO $$ 
                  BEGIN
                    -- Verifica se a constraint existe
                    IF EXISTS (
                      SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'Order_provider_id_fkey' 
                      AND table_name = 'Order'
                    ) THEN
                      -- Remove a constraint
                      ALTER TABLE "Order" DROP CONSTRAINT "Order_provider_id_fkey";
                      RAISE NOTICE 'Constraint removida.';
                    ELSE
                      RAISE NOTICE 'Constraint não encontrada.';
                    END IF;
                  END $$;
                `;
                
                // Criar o provedor
                await prisma.provider.create({
                  data: {
                    id: providerId,
                    name: providerInfo.name || 'Provedor',
                    slug: providerInfo.slug || `provider-${Date.now()}`,
                    api_url: providerInfo.api_url || '',
                    api_key: providerInfo.api_key || '',
                    status: true,
                    created_at: new Date(),
                    updated_at: new Date()
                  }
                });
                
                // Recriar a constraint de chave estrangeira
                await prisma.$executeRaw`
                  ALTER TABLE "Order"
                  ADD CONSTRAINT "Order_provider_id_fkey"
                  FOREIGN KEY ("provider_id")
                  REFERENCES "Provider"("id")
                  ON DELETE SET NULL;
                `;
                
                console.log(`Provedor criado com sucesso: ${providerId}`);
              } catch (providerCreateError) {
                console.error(`Erro ao criar provedor: ${providerCreateError.message}`);
                // Se falhar em criar o provedor, não associar ao pedido
                providerId = null;
              }
            }
          }
          
          if (!externalServiceId) {
            externalServiceId = serviceInfo.external_service_id;
            console.log(`External Service ID obtido do Supabase: ${externalServiceId}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar informações do serviço no Supabase: ${error.message}`);
        // Continuar e tentar o método fallback
      }
      
      // Se não conseguiu no Supabase, tentar no banco local
      if (!foundServiceInfo) {
        console.log('Tentando buscar informações no banco de dados local como fallback...');
        
        const fallbackInfo = await getProviderByServiceId(orderData.service_id);
        if (fallbackInfo) {
          foundServiceInfo = true;
          
          if (!providerId) {
            providerId = fallbackInfo.provider_id;
            console.log(`Provider ID obtido do banco local: ${providerId}`);
          }
          
          if (!externalServiceId) {
            externalServiceId = fallbackInfo.external_service_id;
            console.log(`External Service ID obtido do banco local: ${externalServiceId}`);
          }
          
          providerInfo = fallbackInfo.provider;
        }
      }
    }
    
    // Calcular a quantidade total e por post
    let totalQuantity = orderData.quantity || orderData.total_quantity || 0;
    const postsCount = orderData.posts.length;
    
    // Verificar se o número é válido
    if (isNaN(totalQuantity)) {
      totalQuantity = 0;
    }
    
    // Calcular quantidade média por post (arredondada para inteiro)
    let baseQuantityPerPost = Math.floor(totalQuantity / postsCount);
    let remainingQuantity = totalQuantity - (baseQuantityPerPost * postsCount);
    
    console.log(`Quantidade total: ${totalQuantity}, Posts: ${postsCount}, Base por post: ${baseQuantityPerPost}, Restante: ${remainingQuantity}`);
    
    // Array para armazenar os pedidos criados
    const createdOrders = [];
    
    // Processar cada post
    for (let i = 0; i < orderData.posts.length; i++) {
      const post = orderData.posts[i];
      
      // Extrair código do post
      const postCode = post.code || post.post_code;
      const postUrl = post.url || post.post_url || (postCode ? `https://instagram.com/p/${postCode}/` : null);
      
      // Verificar se já processamos este post na mesma transação (via cache)
      if (postCode) {
        const isPostAlreadyProcessed = trackPostForTransaction(transactionId, postCode);
        if (isPostAlreadyProcessed) {
          console.log(`Post ${postCode} já foi processado para transação ${transactionId}. Pulando...`);
          continue; // Pular para o próximo post
        }
      }
      
      // Gerar um external_order_id único para cada post
      const postExternalOrderId = `batch_${transactionId}_${i}_${Date.now()}`;
      
      // Calcular a quantidade para este post (distribuindo o restante nos primeiros posts)
      let postQuantity = baseQuantityPerPost;
      if (remainingQuantity > 0) {
        postQuantity++;
        remainingQuantity--;
      }
      
      // Garantir que a quantidade é um inteiro positivo
      postQuantity = Math.max(1, Math.round(postQuantity));
      
      // Rastrear este post para a transação
      if (postCode) {
        trackPostForTransaction(transactionId, postCode);
      }
      
      // Preparar dados do post para salvar como metadata
      const postInfo = {
        post_id: post.id,
        post_url: postUrl,
        post_type: post.type || 'post',
        post_code: postCode,
        is_reel: post.is_reel || false,
        index: i,
        total_posts: postsCount
      };
      
      console.log(`Criando pedido para post ${i+1}/${postsCount}: ${postCode || 'Sem código'}`);
      
      // Criar pedido para este post
      const createdOrder = await prisma.order.create({
        data: {
          transaction_id: transactionId,
          service_id: orderData.service_id,
          external_service_id: externalServiceId,
          external_order_id: postExternalOrderId,
          provider_id: providerId,
          status: 'pending',
          amount: (orderData.amount || 0) / postsCount, // Dividir o valor total
          quantity: postQuantity,
          target_username: orderData.target_username || post.username || '',
          target_url: postUrl || '',
          customer_name: orderData.customer_name || '',
          customer_email: orderData.customer_email || '',
          user_id: userId,
          metadata: {
            post: postInfo,
            payment: orderData.payment_data || {},
            batch_info: {
              total_posts: postsCount,
              post_index: i,
              original_quantity: post.quantity || post.calculated_quantity,
              total_quantity: totalQuantity
            },
            external_payment_id: orderData.external_payment_id,
            external_transaction_id: orderData.external_transaction_id,
            service_info: providerInfo ? {
              name: providerInfo.name,
              provider_name: providerInfo.name,
              provider_slug: providerInfo.slug
            } : undefined,
            user_info: userId ? {
              user_id: userId,
              email: orderData.customer_email
            } : undefined
          }
        }
      });
      
      // Criar log da ordem
      await prisma.orderLog.create({
        data: {
          order_id: createdOrder.id,
          message: `Ordem criada com sucesso (lote ${i+1}/${postsCount})`,
          level: 'info',
          data: { 
            source: 'batch_api', 
            method: 'POST /api/orders/batch',
            provider_id: providerId,
            external_service_id: externalServiceId,
            user_id: userId,
            post_code: postCode
          }
        }
      });
      
      createdOrders.push(createdOrder);
      console.log(`Ordem criada com ID: ${createdOrder.id} para post ${postCode || 'Sem código'}`);
      
      // Enviar pedido ao provedor
      if (providerId && externalServiceId) {
        try {
          console.log(`Enviando ordem ${createdOrder.id} para o provedor...`);
          const providerResponse = await sendOrderToProvider(createdOrder);
          
          if (providerResponse.success) {
            console.log(`Ordem ${createdOrder.id} enviada com sucesso ao provedor. Resposta:`, JSON.stringify(providerResponse.data, null, 2));
            
            // Atualizar ordem com ID externo se fornecido pelo provedor
            if (providerResponse.data && providerResponse.data.order) {
              await prisma.order.update({
                where: { id: createdOrder.id },
                data: {
                  external_order_id: ensureString(providerResponse.data.order),
                  status: 'processing'
                }
              });
              
              console.log(`Ordem ${createdOrder.id} atualizada com ID externo: ${providerResponse.data.order}`);
            }
          } else {
            console.error(`Falha ao enviar ordem ${createdOrder.id} para o provedor:`, providerResponse.error);
          }
        } catch (providerError) {
          console.error(`Erro ao enviar ordem ${createdOrder.id} para o provedor:`, providerError);
        }
      } else {
        console.warn(`Não foi possível enviar a ordem ${createdOrder.id} ao provedor: providerId ou externalServiceId não disponíveis`);
      }
    }
    
    // Retornar os pedidos criados
    return res.status(201).json({
      success: true,
      transaction_id: transactionId,
      count: createdOrders.length,
      total_quantity: totalQuantity,
      orders: createdOrders
    });
    
  } catch (error) {
    console.error('Erro ao processar lote de pedidos:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar lote de pedidos', 
      details: error.message 
    });
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

// Rota para buscar pedidos por email do usuário
app.post('/api/orders/by-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email não fornecido'
      });
    }
    
    console.log(`Buscando pedidos para o email: ${email}`);
    
    // Primeiro verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: { email }
    });
    
    // Se não encontrar usuário pelo ID no sistema, buscar pedidos pelo email
    const orders = await prisma.order.findMany({
      where: user 
        ? { user_id: user.id } 
        : { customer_email: email },
      include: {
        logs: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`Encontrados ${orders.length} pedidos para o email ${email}`);
    
    return res.status(200).json({
      success: true,
      user: user,
      count: orders.length,
      orders
    });
    
  } catch (error) {
    console.error('Erro ao buscar pedidos por email:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota para verificar estatísticas de uma transação (para debug)
app.get('/api/debug/transaction/:transactionId', async (req, res) => {
  try {
    const transactionId = req.params.transactionId;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'ID da transação não fornecido'
      });
    }
    
    // Buscar estatísticas de rastreamento da transação
    const stats = getTransactionStats(transactionId);
    
    // Buscar pedidos da transação no banco
    const orders = await prisma.order.findMany({
      where: { transaction_id: transactionId },
      select: {
        id: true,
        external_order_id: true,
        status: true,
        target_url: true,
        created_at: true,
        metadata: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    return res.status(200).json({
      success: true,
      transaction_id: transactionId,
      tracking_stats: stats,
      orders_count: orders.length,
      orders
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas da transação:', error);
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
      { path: '/api/orders/create', method: 'POST', description: 'Criar pedido individual' },
      { path: '/api/orders/batch', method: 'POST', description: 'Criar múltiplos pedidos de uma transação (array de posts)' },
      { path: '/api/orders/:id', method: 'GET', description: 'Consultar status de um pedido' },
      { path: '/api/orders/by-transaction/:transactionId', method: 'GET', description: 'Consultar pedidos por transaction_id' },
      { path: '/api/orders/:id/process', method: 'POST', description: 'Processar um pedido específico (enviar ao provedor)' },
      { path: '/api/orders/process-by-transaction/:transactionId', method: 'POST', description: 'Processar todos os pedidos pendentes de uma transação' },
      { path: '/api/orders/by-email', method: 'POST', description: 'Consultar pedidos por email do usuário' },
      { path: '/api/debug/transaction/:transactionId', method: 'GET', description: 'Ver estatísticas de rastreamento de uma transação' },
      { path: '/api/orders/webhook/status', method: 'POST', description: 'Webhook para receber atualizações de status dos provedores' },
      { path: '/api/orders/webhook/payment', method: 'POST', description: 'Webhook para receber notificações de pagamento' }
    ]
  });
});

// Rota para processar um pedido específico
app.post('/api/orders/:id/process', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Buscar o pedido no banco de dados
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provider: true
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Verificar se o pedido já foi processado
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Pedido não pode ser processado, status atual: ${order.status}`
      });
    }
    
    // Enviar pedido para o provedor
    try {
      // Preparar payload para o provedor
      const payload = {
        key: order.provider.api_key,
        action: 'add',
        service: parseInt(order.external_service_id),
        link: order.target_url,
        quantity: order.quantity
      };
      
      console.log(`Enviando pedido para provedor ${order.provider.name}:`, payload);
      
      // Enviar para o provedor
      const response = await axios.post(order.provider.api_url, payload);
      
      console.log(`Resposta do provedor: ${JSON.stringify(response.data)}`);
      
      // Verificar resposta
      if (!response.data || response.data.error) {
        throw new Error(`Erro do provedor: ${JSON.stringify(response.data)}`);
      }
      
      // Armazenar resposta do provedor
      const providerResponse = response.data;
      
      // Atualizar o pedido com a resposta do provedor
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'processing',
          provider_response: providerResponse, // Salvar a resposta completa do provedor
          processed: true,
          processed_at: new Date(),
          external_order_id: providerResponse.order ? ensureString(providerResponse.order) : null,
          metadata: {
            ...order.metadata,
            provider_processing: {
              provider_order_id: providerResponse.order ? ensureString(providerResponse.order) : null,
              sent_at: new Date().toISOString(),
              provider_response: providerResponse
            }
          }
        }
      });
      
      // Registrar sucesso no log
      await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level: 'info',
          message: `Pedido enviado para o provedor com sucesso. ID do pedido no provedor: ${providerResponse.order || 'não informado'}`,
          data: { 
            provider_response: providerResponse,
            payload
          }
        }
      });
      
      return res.json({
        success: true,
        message: 'Pedido enviado para processamento',
        provider_order_id: providerResponse.order || null,
        provider_response: providerResponse
      });
      
    } catch (providerError) {
      // ... código existente para tratar erros ...
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
      },
      include: {
        provider: true // Incluir dados do provedor
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
      
      try {
        // Verificar se temos todas as informações necessárias
        if (!order.provider || !order.provider.api_key || !order.provider.api_url || !order.external_service_id) {
          throw new Error('Informações de provedor ou serviço incompletas');
        }
        
        // Preparar payload para o provedor
        const payload = {
          key: order.provider.api_key,
          action: 'add',
          service: parseInt(order.external_service_id),
          link: order.target_url,
          quantity: order.quantity
        };
        
        console.log(`Enviando pedido para provedor ${order.provider.name}:`, payload);
        
        // Enviar para o provedor
        const response = await axios.post(order.provider.api_url, payload);
        
        console.log(`Resposta do provedor: ${JSON.stringify(response.data)}`);
        
        // Verificar resposta
        if (!response.data || response.data.error) {
          throw new Error(`Erro do provedor: ${JSON.stringify(response.data)}`);
        }
        
        // Armazenar resposta do provedor
        const providerResponse = response.data;
        
        // Atualizar o pedido com a resposta do provedor
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'processing',
            provider_response: providerResponse, // Salvar a resposta completa do provedor
            processed: true,
            processed_at: new Date(),
            external_order_id: ensureString(providerResponse.order),
            metadata: {
              ...order.metadata,
              provider_processing: {
                provider_order_id: ensureString(providerResponse.order),
                sent_at: new Date().toISOString(),
                provider_response: providerResponse
              }
            }
          }
        });
        
        // Registrar sucesso no log
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            level: 'info',
            message: `Pedido enviado para o provedor com sucesso. ID do pedido no provedor: ${providerResponse.order || 'não informado'}`,
            data: { 
              provider_response: providerResponse,
              payload
            }
          }
        });
        
        results.push({
          order_id: order.id,
          success: true,
          provider_order_id: providerResponse.order || null,
          provider_response: providerResponse
        });
      } catch (error) {
        console.error(`Erro ao processar pedido ${order.id}:`, error);
        
        // Registrar o erro
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            message: `Erro ao enviar pedido ao provedor: ${error.message}`,
            level: 'error',
            data: { error: error.message, stack: error.stack }
          }
        });
        
        // Atualizar o pedido para status de erro
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'failed',
            metadata: {
              ...order.metadata,
              processing_error: {
                message: error.message,
                timestamp: new Date().toISOString()
              }
            }
          }
        });
        
        results.push({
          order_id: order.id,
          success: false,
          error: error.message
        });
      }
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

// Adicionar rota de webhook para atualizações de status dos provedores
app.post('/api/orders/webhook/status', async (req, res) => {
  try {
    console.log('Recebido webhook de atualização de status:', JSON.stringify(req.body, null, 2));
    
    // Extrair dados do webhook - diferentes provedores podem ter formatos diferentes
    const webhookData = req.body;
    
    // Verificar se temos um ID de pedido do provedor
    const providerOrderId = webhookData.order || webhookData.order_id;
    if (!providerOrderId) {
      console.warn('Webhook recebido sem ID de pedido do provedor');
      return res.status(400).json({ 
        success: false, 
        error: 'ID de pedido do provedor não encontrado no webhook' 
      });
    }
    
    // Buscar pedido pelo provider_response.order
    const order = await prisma.order.findFirst({
      where: {
        provider_response: {
          path: ['order'],
          equals: providerOrderId
        }
      }
    });
    
    if (!order) {
      console.warn(`Nenhum pedido encontrado para o ID do provedor: ${providerOrderId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }
    
    console.log(`Pedido encontrado: ${order.id}`);
    
    // Mapear status do provedor para nosso sistema
    let newStatus = 'processing'; // Status padrão
    
    if (webhookData.status) {
      if (['completed', 'complete', 'done', 'finished'].includes(webhookData.status.toLowerCase())) {
        newStatus = 'completed';
      } else if (['failed', 'error', 'cancelled', 'canceled'].includes(webhookData.status.toLowerCase())) {
        newStatus = 'failed';
      } else if (['pending', 'processing', 'in_progress', 'progress'].includes(webhookData.status.toLowerCase())) {
        newStatus = 'processing';
      }
    }
    
    // Atualizar pedido com as informações do webhook
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        metadata: {
          ...order.metadata,
          webhook_updates: [
            ...(order.metadata?.webhook_updates || []),
            {
              timestamp: new Date().toISOString(),
              data: webhookData,
              mapped_status: newStatus
            }
          ]
        }
      }
    });
    
    // Criar log do webhook
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        message: `Webhook recebido: Status atualizado para ${newStatus}`,
        level: 'info',
        data: webhookData
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso',
      order_id: order.id,
      new_status: newStatus
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota de webhook para receber notificações de pagamento
app.post('/api/orders/webhook/payment', async (req, res) => {
  try {
    console.log('Recebido webhook de pagamento:', JSON.stringify(req.body, null, 2));
    
    const { transaction_id, metadata } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'ID de transação não fornecido no webhook'
      });
    }
    
    // Verificar se existem pedidos para esta transação
    const ordersCount = await prisma.order.count({
      where: { transaction_id }
    });
    
    if (ordersCount === 0) {
      console.log(`Nenhum pedido encontrado para transaction_id ${transaction_id}, criando novos pedidos...`);
      
      // Se não houver pedidos, criar novos pedidos para os posts
      if (!metadata || !metadata.posts || !Array.isArray(metadata.posts) || metadata.posts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados de posts não fornecidos no webhook'
        });
      }
      
      // Verificar se o provider existe
      let validProviderId = null;
      if (metadata.provider_id) {
        const providerExists = await prisma.provider.findUnique({
          where: { id: metadata.provider_id }
        });
        
        if (providerExists) {
          validProviderId = metadata.provider_id;
          console.log(`[Orders Webhook] Provider encontrado: ${validProviderId}`);
        } else {
          console.log(`[Orders Webhook] ATENÇÃO: Provider ${metadata.provider_id} não encontrado na base de dados!`);
          console.log(`[Orders Webhook] Isso pode indicar um problema de sincronização entre sistemas.`);
          console.log(`[Orders Webhook] Criando pedido sem provider_id para evitar falha.`);
          validProviderId = null;
        }
      }
      
      // Criar pedidos para cada post
      const createdOrders = [];
      
      for (const post of metadata.posts) {
        // Criar pedido
        const createdOrder = await prisma.order.create({
          data: {
            transaction_id,
            service_id: metadata.service || null,
            external_service_id: metadata.external_service_id || null,
            provider_id: validProviderId, // Usar provider_id validado
            status: 'pending',
            target_username: metadata.profile || post.username || '',
            target_url: post.url || `https://instagram.com/p/${post.code}/`,
            quantity: post.quantity || metadata.total_quantity || 100,
            customer_email: metadata.customer?.email || '',
            customer_name: metadata.customer?.name || '',
            metadata: {
              payment_webhook: {
                received_at: new Date().toISOString(),
                data: req.body
              },
              post: {
                post_id: post.id,
                post_code: post.code,
                post_url: post.url,
                type: post.type || 'post'
              }
            }
          }
        });
        
        createdOrders.push(createdOrder);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Pedidos criados com sucesso a partir do webhook',
        orders_count: createdOrders.length,
        orders: createdOrders.map(o => o.id)
      });
    }
    
    console.log(`Encontrados ${ordersCount} pedidos para transaction_id ${transaction_id}`);
    
    // Se já existem pedidos, apenas atualizar o status para 'pending_processing'
    await prisma.order.updateMany({
      where: { 
        transaction_id,
        status: 'pending'
      },
      data: {
        status: 'pending_processing',
        metadata: {
          payment_webhook: {
            received_at: new Date().toISOString(),
            data: req.body
          }
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Pagamento confirmado, pedidos atualizados',
      transaction_id,
      orders_updated: ordersCount
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook de pagamento:', error);
    return res.status(500).json({
      success: false,
      error: `Erro interno: ${error.message}`
    });
  }
});

// Rota para atualizar orders no Prisma após processamento
app.put('/api/orders/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const currentTimestamp = new Date();
    
    try {
      // Verificar se a coluna 'processed' existe antes de tentar atualizar
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Order' AND column_name = 'processed'
          ) THEN
            ALTER TABLE "Order" ADD COLUMN processed BOOLEAN NOT NULL DEFAULT false;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Order' AND column_name = 'processed_at'
          ) THEN
            ALTER TABLE "Order" ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
          END IF;
        END $$;
      `;
      
      // Agora podemos atualizar com segurança
      await prisma.order.update({
        where: { id },
        data: {
          processed: true,
          processed_at: currentTimestamp,
          // Outros campos que precisam ser atualizados
          updated_at: currentTimestamp
        }
      });
      
      return res.json({ success: true, order: { id, processed: true, processed_at: currentTimestamp } });
    } catch (updateError) {
      console.error('Erro ao atualizar campos de processamento:', updateError);
      
      // Fallback para atualizações parciais se as colunas não existirem
      await prisma.order.update({
        where: { id },
        data: {
          // Apenas atualizar o timestamp genérico se as colunas não existirem
          updated_at: currentTimestamp
        }
      });
      
      return res.json({ 
        success: true, 
        warning: 'Atualização parcial concluída: colunas de processamento não estão disponíveis',
        order: { id, updated_at: currentTimestamp } 
      });
    }
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
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