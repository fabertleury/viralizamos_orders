import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { orderResolvers } from './order';

const prisma = new PrismaClient();

// Resolvers para o GraphQL
export const resolvers = {
  // Scalar resolvers
  DateTime: DateTimeResolver,
  
  Query: {
    // Manter apenas os resolvers de entidades que ainda existem
    ...orderResolvers.Query,
    
    // Provider resolvers
    providers: () => {
      return prisma.provider.findMany();
    },
    provider: (_, { id }) => {
      return prisma.provider.findUnique({
        where: { id }
      });
    },
    
    // User resolvers
    users: () => {
      return prisma.user.findMany();
    },
    user: (_, { id }) => {
      return prisma.user.findUnique({
        where: { id }
      });
    },
    
    // Health check resolver
    health: () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    }
  },
  
  Mutation: {
    // Manter apenas os resolvers de entidades que ainda existem
    ...orderResolvers.Mutation,
    
    // Log resolvers
    createOrderLog: async (_, { orderId, level, message, data }) => {
      const log = await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level,
          message,
          data,
        }
      });
      
      return log;
    },
    
    // Provider resolvers
    createProvider: async (_, { name, slug, apiUrl, apiKey }) => {
      const provider = await prisma.provider.create({
        data: {
          name,
          slug,
          api_url: apiUrl,
          api_key: apiKey,
          status: true
        }
      });
      
      return provider;
    },
    
    updateProvider: async (_, { id, name, slug, apiUrl, apiKey, status }) => {
      const provider = await prisma.provider.update({
        where: { id },
        data: {
          name,
          slug,
          api_url: apiUrl,
          api_key: apiKey,
          status
        }
      });
      
      return provider;
    },
    
    // Order status update resolver
    updateOrderStatus: async (_, { id, status, externalId, response }) => {
      const order = await prisma.order.update({
        where: { id },
        data: {
          status,
          external_order_id: externalId,
          provider_response: response
        }
      });
      
      // Log the status update
      await prisma.orderLog.create({
        data: {
          order_id: id,
          level: 'info',
          message: `Status updated to ${status}`,
          data: {
            previous_status: order.status,
            new_status: status,
            external_id: externalId
          },
        }
      });
      
      return order;
    }
  }
};
