/**
 * Servidor completo para o microserviço de orders
 * Implementa todas as funcionalidades necessárias para processar pedidos
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const cors = require('cors');
const axios = require('axios');

// Inicializar prisma
const prisma = new PrismaClient();

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
  res.status(200).json({
    status: 'ok',
    service: 'viralizamos-orders-complete',
    timestamp: new Date().toISOString()
  });
});

// Rota para criar pedidos
app.post('/api/orders/create', async (req, res) => {
  try {
    console.log('Recebida solicitação para criar pedido:', JSON.stringify(req.body));
    
    const {
      transaction_id,
      service_id,
      external_service_id,
      target_username,
      amount,
      quantity,
      target_url,
      customer_name,
      customer_email,
      post_data,
      external_payment_id,
      payment_data
    } = req.body;
    
    // Validação básica
    if (!transaction_id || !target_username) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos na solicitação'
      });
    }
    
    console.log(`Processando pedido para: ${target_username} (transação: ${transaction_id})`);
    
    // Verificar se o pedido já existe
    const existingOrder = await prisma.order.findFirst({
      where: {
        transaction_id
      }
    }).catch(err => {
      console.error('Erro ao verificar pedido existente:', err);
      return null;
    });
    
    if (existingOrder) {
      console.log(`Pedido já existe para transação ${transaction_id}: ${existingOrder.id}`);
      return res.status(200).json({
        success: true,
        order_id: existingOrder.id,
        message: 'Pedido já processado anteriormente'
      });
    }
    
    // Processar posts se estiverem presentes nos dados
    const posts = [];
    if (post_data) {
      if (Array.isArray(post_data)) {
        posts.push(...post_data);
      } else if (post_data.post_code || post_data.post_id) {
        posts.push(post_data);
      }
    }
    
    // Se não houver posts definidos, criar um post padrão
    if (posts.length === 0) {
      posts.push({
        post_code: 'default',
        post_url: target_url || `https://instagram.com/${target_username}`
      });
    }
    
    console.log(`Processando ${posts.length} posts para o pedido`);
    
    // Criar pedidos no banco de dados
    const createdOrders = [];
    const totalQuantity = quantity || 500;
    const quantityPerPost = Math.floor(totalQuantity / posts.length);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postCode = post.post_code || post.post_id || `post-${i+1}`;
      const postUrl = post.post_url || target_url || `https://instagram.com/${target_username}`;
      
      // Informações para registrar no log
      console.log(`Criando pedido para post ${i+1}/${posts.length}: ${postCode}`);
      
      try {
        // Criar o pedido no banco de dados
        const order = await prisma.order.create({
          data: {
            transaction_id,
            // Não incluir service_id diretamente para evitar erro de chave estrangeira
            external_service_id: external_service_id || service_id,
            status: 'pending',
            amount: amount ? Number(amount) / posts.length : 0,
            quantity: quantityPerPost,
            target_username,
            target_url: postUrl,
            customer_name,
            customer_email,
            metadata: {
              post_code: postCode,
              post_url: postUrl,
              service_id: service_id,  // Armazenar o service_id em metadata para evitar problemas de FK
              payment_id: external_payment_id,
              payment_data: payment_data,
              order_index: i,
              total_posts: posts.length
            }
          }
        });
        
        console.log(`Pedido criado com ID: ${order.id}`);
        createdOrders.push({
          id: order.id,
          post_code: postCode
        });
        
        // Registrar log do pedido
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            level: 'info',
            message: 'Pedido criado via API',
            data: {
              source: 'payment-system',
              transaction_id,
              post_code: postCode
            }
          }
        }).catch(err => {
          console.error(`Erro ao criar log para pedido ${order.id}:`, err);
        });
        
      } catch (orderError) {
        console.error(`Erro ao criar pedido para post ${postCode}:`, orderError);
        
        // Se for o primeiro pedido e falhar, retornar erro
        if (i === 0 && createdOrders.length === 0) {
          return res.status(500).json({
            success: false,
            error: `Falha ao criar pedido: ${orderError.message}`
          });
        }
        
        // Se algum já foi criado, continuar com os outros
      }
    }
    
    // Se pelo menos um pedido foi criado, considerar sucesso
    if (createdOrders.length > 0) {
      const orderIds = createdOrders.map(o => o.id);
      console.log(`${createdOrders.length} pedidos criados com sucesso:`, orderIds.join(', '));
      
      return res.status(200).json({
        success: true,
        order_ids: orderIds,
        order_id: orderIds[0],  // Para compatibilidade com versões anteriores
        message: `${createdOrders.length} pedidos criados com sucesso`,
        details: createdOrders
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao criar pedidos. Nenhum pedido foi criado.'
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
      { path: '/api/orders/:id', method: 'GET', description: 'Consultar status de um pedido' }
    ]
  });
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

// Iniciar o servidor HTTP
const server = http.createServer(app);

// Verificar conexão com o banco de dados antes de iniciar
async function startServer() {
  try {
    // Testar conexão com o banco de dados
    console.log('Verificando conexão com o banco de dados...');
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Conexão com banco de dados estabelecida com sucesso!');
    
    // Executar correções no banco de dados, se necessário
    console.log('Aplicando correções no banco de dados...');
    try {
      // Remover restrição de chave estrangeira problemática
      await prisma.$executeRawUnsafe(`ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";`);
      console.log('✅ Restrição de chave estrangeira removida ou não existente');
      
      // Inserir serviços necessários
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Service" (id, name, type, status, created_at, updated_at)
        VALUES 
          ('89cd99e0-83af-43f6-816e-67d68158d482', 'Serviço Instagram (Likes)', 'instagram', 'active', NOW(), NOW()),
          ('691a9dfa-0ea2-41a4-bd5f-6104b80365e0', 'Serviço Instagram (Import)', 'instagram', 'active', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Serviços necessários inseridos ou já existentes');
    } catch (fixError) {
      console.error('⚠️ Erro ao aplicar correções no banco de dados:', fixError);
      console.log('⚠️ O servidor continuará mesmo assim, mas pode haver problemas');
    }
    
    // Iniciar o servidor HTTP
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor completo rodando em http://0.0.0.0:${PORT}`);
      console.log('✅ API está disponível e pronta para processar pedidos');
    });
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    console.error('❌ O servidor não pode ser iniciado sem conexão com o banco de dados');
    process.exit(1);
  }
}

// Iniciar o servidor
startServer(); 