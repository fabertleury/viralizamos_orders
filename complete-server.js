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
    
    // Verificar se o serviço 'viralizamos' existe
    const service = await prisma.service.findFirst({
      where: { name: 'viralizamos' }
    });
    
    // Se não existir, criar
    if (!service) {
      await prisma.service.create({
        data: {
          name: 'viralizamos',
          description: 'Serviço principal da Viralizamos',
          url: 'https://viralizamos.com'
        }
      });
      console.log('Serviço "viralizamos" criado com sucesso.');
    } else {
      console.log('Serviço "viralizamos" já existe, nenhuma alteração necessária.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao aplicar correções no banco de dados:', error);
    throw error;
  }
}

// Rota para criar pedidos
app.post('/api/orders/create', async (req, res) => {
  console.log('Recebido pedido para criar ordem:', JSON.stringify(req.body, null, 2));
  
  try {
    const { order } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Dados de ordem não fornecidos' });
    }
    
    // Se houver múltiplos posts, criar uma ordem para cada um
    if (order.posts && Array.isArray(order.posts) && order.posts.length > 0) {
      console.log(`Processando ${order.posts.length} posts individuais`);
      
      const createdOrders = [];
      
      for (const post of order.posts) {
        const orderData = {
          ...order,
          posts: [post]
        };
        
        const createdOrder = await prisma.order.create({
          data: {
            rawData: JSON.stringify(orderData),
            status: 'CREATED',
            service: {
              connect: {
                name: 'viralizamos'
              }
            }
          }
        });
        
        // Criar log da ordem
        await prisma.orderLog.create({
          data: {
            orderId: createdOrder.id,
            status: 'CREATED',
            message: 'Ordem criada com sucesso'
          }
        });
        
        createdOrders.push(createdOrder);
        console.log(`Ordem criada com ID: ${createdOrder.id}`);
      }
      
      return res.status(201).json({ success: true, orders: createdOrders });
    } else {
      // Processar como uma única ordem
      const createdOrder = await prisma.order.create({
        data: {
          rawData: JSON.stringify(order),
          status: 'CREATED',
          service: {
            connect: {
              name: 'viralizamos'
            }
          }
        }
      });
      
      // Criar log da ordem
      await prisma.orderLog.create({
        data: {
          orderId: createdOrder.id,
          status: 'CREATED',
          message: 'Ordem criada com sucesso'
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