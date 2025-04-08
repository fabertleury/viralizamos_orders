import Queue from 'bull';
import axios from 'axios';
import { processOrder } from './process-order';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

// Configurações
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Padrões de agendamento CRON
const PENDING_ORDERS_CRON = process.env.SCHEDULER_CRON_PENDING_ORDERS || '*/15 * * * *';
const STATUS_CHECK_CRON = process.env.SCHEDULER_CRON_STATUS_CHECK || '*/30 * * * *';

// Gerar token JWT para autenticação interna
const generateAuthToken = (): string => {
  return sign(
    { 
      service: 'order-scheduler',
      timestamp: Date.now()
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

// Criar filas para diferentes tipos de jobs
const pendingOrdersQueue = new Queue('pending-orders-processing', process.env.REDIS_URL);
const statusCheckQueue = new Queue('order-status-check', process.env.REDIS_URL);

// Processador para pedidos pendentes
pendingOrdersQueue.process(async (job) => {
  try {
    console.log(`[Scheduler] Processando lote de pedidos pendentes (${new Date().toISOString()})`);
    
    // Buscar pedidos pendentes
    const limit = job.data.limit || 10;
    
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        created_at: 'asc'
      },
      take: limit,
      select: {
        id: true
      }
    });
    
    console.log(`[Scheduler] Encontrados ${pendingOrders.length} pedidos pendentes`);
    
    if (pendingOrders.length === 0) {
      return { message: 'Não há pedidos pendentes para processar' };
    }
    
    // Processar os pedidos
    const results = [];
    
    for (const order of pendingOrders) {
      try {
        console.log(`[Scheduler] Processando pedido ${order.id}`);
        const success = await processOrder(order.id);
        results.push({
          id: order.id,
          success
        });
      } catch (error) {
        console.error(`[Scheduler] Erro ao processar pedido ${order.id}:`, error);
        results.push({
          id: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    // Registrar processamento em lote
    await prisma.batchProcessLog.create({
      data: {
        type: 'order_processing',
        total_processed: pendingOrders.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        data: results
      }
    });
    
    return {
      processed: pendingOrders.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      orders: results
    };
  } catch (error) {
    console.error('[Scheduler] Erro ao processar lote de pedidos pendentes:', error);
    throw error;
  }
});

// Processador para verificação de status
statusCheckQueue.process(async (job) => {
  try {
    console.log(`[Scheduler] Verificando status de pedidos em processamento (${new Date().toISOString()})`);
    
    // Buscar pedidos em processamento
    const processingOrders = await prisma.order.findMany({
      where: {
        status: 'processing'
      },
      include: {
        provider: true
      },
      take: job.data.limit || 20
    });
    
    console.log(`[Scheduler] Encontrados ${processingOrders.length} pedidos em processamento`);
    
    if (processingOrders.length === 0) {
      return { message: 'Não há pedidos em processamento para verificar' };
    }
    
    // Verificar status de cada pedido no provedor
    const results = [];
    
    for (const order of processingOrders) {
      try {
        if (!order.provider || !order.external_order_id) {
          continue;
        }
        
        // Preparar payload para o provedor
        const statusPayload = {
          key: order.provider.api_key,
          action: 'status',
          order: order.external_order_id
        };
        
        // Consultar status no provedor
        const response = await axios.post(order.provider.api_url, statusPayload);
        
        // Processar resposta
        if (response.data && response.data.status) {
          let newStatus = 'processing';
          
          // Mapear status do provedor para nosso sistema
          if (['completed', 'done', 'finished'].includes(response.data.status.toLowerCase())) {
            newStatus = 'completed';
          } else if (['failed', 'error', 'cancelled'].includes(response.data.status.toLowerCase())) {
            newStatus = 'failed';
          }
          
          // Atualizar o pedido se o status mudou
          if (newStatus !== order.status) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: newStatus,
                completed_at: newStatus === 'completed' ? new Date() : null,
                provider_response: {
                  ...order.provider_response as any || {},
                  status_update: response.data
                }
              }
            });
            
            // Registrar o log
            await prisma.orderLog.create({
              data: {
                order_id: order.id,
                level: 'info',
                message: `Status atualizado para ${newStatus}`,
                data: {
                  provider_status: response.data.status,
                  previous_status: order.status
                }
              }
            });
          }
          
          results.push({
            id: order.id,
            external_id: order.external_order_id,
            previous_status: order.status,
            current_status: newStatus,
            provider_status: response.data.status
          });
        }
      } catch (error) {
        console.error(`[Scheduler] Erro ao verificar status do pedido ${order.id}:`, error);
        
        // Registrar erro
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            level: 'error',
            message: 'Erro ao verificar status no provedor',
            data: {
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            }
          }
        });
        
        results.push({
          id: order.id,
          external_id: order.external_order_id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    return {
      checked: processingOrders.length,
      results
    };
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar status de pedidos:', error);
    throw error;
  }
});

// Tratamento de erros
pendingOrdersQueue.on('failed', (job, error) => {
  console.error(`[Scheduler] Job de processamento de pedidos falhou (${job.id}):`, error);
});

statusCheckQueue.on('failed', (job, error) => {
  console.error(`[Scheduler] Job de verificação de status falhou (${job.id}):`, error);
});

// Inicializar agendamento
export const initScheduler = () => {
  console.log('[Scheduler] Inicializando agendador de tarefas...');
  
  // Remover jobs existentes para evitar duplicação
  pendingOrdersQueue.clean(0, 'delayed');
  pendingOrdersQueue.clean(0, 'wait');
  statusCheckQueue.clean(0, 'delayed');
  statusCheckQueue.clean(0, 'wait');
  
  // Agendar processamento de pedidos pendentes usando a configuração CRON do .env
  pendingOrdersQueue.add(
    { limit: 10 },
    { 
      repeat: { cron: PENDING_ORDERS_CRON },
      jobId: 'process-pending-orders'
    }
  );
  
  // Agendar verificação de status usando a configuração CRON do .env
  statusCheckQueue.add(
    { limit: 20 },
    { 
      repeat: { cron: STATUS_CHECK_CRON },
      jobId: 'check-order-status'
    }
  );
  
  console.log(`[Scheduler] Agendador inicializado com sucesso!`);
  console.log(`[Scheduler] Agendamento de pedidos pendentes: ${PENDING_ORDERS_CRON}`);
  console.log(`[Scheduler] Agendamento de verificação de status: ${STATUS_CHECK_CRON}`);
  
  return {
    pendingOrdersQueue,
    statusCheckQueue
  };
};

// Exportar filas para uso em outros lugares da aplicação
export { 
  pendingOrdersQueue, 
  statusCheckQueue
}; 