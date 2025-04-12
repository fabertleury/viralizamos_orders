import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { orderResolvers } from './order';

const prisma = new PrismaClient();

// Resolvers para o GraphQL
export const resolvers = {
  // Scalar resolvers
  DateTime: {
    // Implementação simples do resolver DateTime
    serialize(value: Date): string {
      return value.toISOString();
    },
    parseValue(value: any): Date {
      return new Date(value);
    },
    parseLiteral(ast: any): Date | null {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    }
  },
  
  Query: {
    // Manter apenas os resolvers de entidades que ainda existem
    ...orderResolvers.Query,
    
    // Provider resolvers
    providers: () => {
      return prisma.provider.findMany();
    },
    provider: (_: any, { id }: { id: string }) => {
      return prisma.provider.findUnique({
        where: { id }
      });
    },
    
    // User resolvers
    users: () => {
      return prisma.user.findMany();
    },
    user: (_: any, { id }: { id: string }) => {
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
    createOrderLog: async (_: any, { orderId, level, message, data }: { orderId: string, level: string, message: string, data: any }) => {
      const log = await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level,
          message,
          data
        }
      });
      
      return log;
    },
    
    // Provider resolvers
    createProvider: async (_: any, { name, slug, apiUrl, apiKey }: { name: string, slug: string, apiUrl: string, apiKey: string }) => {
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
    
    updateProvider: async (_: any, { id, name, slug, apiUrl, apiKey, status }: { id: string, name?: string, slug?: string, apiUrl?: string, apiKey?: string, status?: boolean }) => {
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
    updateOrderStatus: async (_: any, { id, status, externalId, response }: { id: string, status: string, externalId?: string, response?: any }) => {
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
          }
        }
      });
      
      return order;
    }
  }
};
