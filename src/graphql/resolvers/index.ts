import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

// Resolvers para o GraphQL
export const resolvers = {
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
    
    order: async (_: any, args: { id: string }) => {
      return prisma.order.findUnique({
        where: { id: args.id }
      });
    },
    
    orderLogs: async (_: any, args: { orderId: string }) => {
      return prisma.orderLog.findMany({
        where: { order_id: args.orderId },
        orderBy: { created_at: 'desc' }
      });
    },
    
    // Consultas para serviços
    services: async (_: any, args: { providerId?: string }) => {
      const where = args.providerId ? { provider_id: args.providerId } : {};
      
      return prisma.service.findMany({ where });
    },
    
    // Consultas para provedores
    providers: async () => {
      return prisma.provider.findMany({
        orderBy: { name: 'asc' }
      });
    },
    
    provider: async (_: any, args: { id: string }) => {
      return prisma.provider.findUnique({
        where: { id: args.id }
      });
    }
  },
  
  Mutation: {
    // Mutações para ordens
    createOrder: async (_: any, args: {
      transaction_id: string;
      service_id: string;
      target_username: string;
      quantity: number;
      attributes?: any;
    }) => {
      const { transaction_id, service_id, target_username, quantity, attributes } = args;
      
      try {
        // Verificar se o serviço existe
        const service = await prisma.service.findUnique({
          where: { id: service_id }
        });
        
        if (!service) {
          throw new GraphQLError('Serviço não encontrado');
        }
        
        // Criar a ordem
        const order = await prisma.order.create({
          data: {
            transaction_id,
            service_id,
            provider_id: service.provider_id,
            target_username,
            quantity: quantity || service.default_quantity || 1,
            attributes: attributes || {},
            status: 'pending'
          }
        });
        
        // Registrar o log
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            status: 'pending',
            notes: 'Pedido criado',
            metadata: {}
          }
        });
        
        return order;
      } catch (error) {
        console.error('Erro ao criar ordem:', error);
        throw new GraphQLError('Erro ao criar ordem');
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
          throw new GraphQLError('Ordem não encontrada');
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
              status: status,
              notes: notes || `Status atualizado para: ${status}`,
              metadata: {}
            }
          });
        }
        
        return order;
      } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        throw new GraphQLError('Erro ao atualizar ordem');
      }
    }
  }
};
