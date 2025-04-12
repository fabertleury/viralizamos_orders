import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const orderResolvers = {
  Query: {
    // Consultas para ordens
    orders: async (_: any, args: { limit: number; offset: number; status?: string; search?: string }) => {
      const { limit = 10, offset = 0, status, search } = args;
      
      // Construir filtros
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { target_username: { contains: search, mode: 'insensitive' } },
          { transaction_id: { contains: search } }
        ];
      }
      
      // Buscar ordens e contar total
      const [orders, count] = await Promise.all([
        prisma.order.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' }
        }),
        prisma.order.count({ where })
      ]);
      
      return {
        orders,
        count
      };
    },
    
    // Buscar uma ordem pelo ID
    order: async (_: any, args: { id: string }) => {
      return prisma.order.findUnique({
        where: { id: args.id }
      });
    },
    
    // Buscar logs de uma ordem
    orderLogs: async (_: any, args: { orderId: string }) => {
      return prisma.orderLog.findMany({
        where: { order_id: args.orderId },
        orderBy: { created_at: 'desc' }
      });
    }
  },
  
  Mutation: {
    // Mutações para ordens
    createOrder: async (_: any, args: {
      transaction_id: string;
      external_service_id: string;
      provider_id?: string;
      target_username: string;
      target_url: string;
      quantity: number;
      attributes?: any;
    }) => {
      const { transaction_id, external_service_id, provider_id, target_username, target_url, quantity, attributes } = args;
      
      try {
        // Criar a ordem
        const order = await prisma.order.create({
          data: {
            transaction_id,
            external_service_id,
            provider_id,
            target_username,
            target_url,
            quantity: quantity || 1,
            metadata: attributes || {},
            status: 'pending'
          }
        });
        
        // Registrar o log
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            level: 'info',
            message: 'Pedido criado',
            data: {}
          }
        });
        
        return order;
      } catch (error) {
        console.error('Erro ao criar ordem:', error);
        throw new Error('Erro ao criar ordem');
      }
    },
    
    updateOrder: async (_: any, args: {
      id: string;
      status?: string;
      notes?: string;
    }) => {
      const { id, status, notes } = args;
      
      try {
        // Verificar se a ordem existe
        const existingOrder = await prisma.order.findUnique({
          where: { id }
        });
        
        if (!existingOrder) {
          throw new Error('Ordem não encontrada');
        }
        
        // Atualizar a ordem
        const order = await prisma.order.update({
          where: { id },
          data: {
            status: status || existingOrder.status,
            updated_at: new Date()
          }
        });
        
        // Registrar o log
        if (status) {
          await prisma.orderLog.create({
            data: {
              order_id: id,
              level: 'info',
              message: notes || `Status atualizado para: ${status}`,
              data: {}
            }
          });
        }
        
        return order;
      } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        throw new Error('Erro ao atualizar ordem');
      }
    }
  }
}; 