"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const graphql_1 = require("graphql");
const prisma = new client_1.PrismaClient();
// Resolvers para o GraphQL
exports.resolvers = {
    Query: {
        // Consultas para ordens
        orders: async (_, args) => {
            const { limit = 10, offset = 0, status, search } = args;
            // Construir filtros
            const where = {};
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
        order: async (_, args) => {
            return prisma.order.findUnique({
                where: { id: args.id }
            });
        },
        orderLogs: async (_, args) => {
            return prisma.orderLog.findMany({
                where: { order_id: args.orderId },
                orderBy: { created_at: 'desc' }
            });
        },
        // Consultas para serviços
        services: async (_, args) => {
            const where = args.providerId ? { provider_id: args.providerId } : {};
            return prisma.service.findMany({ where });
        },
        // Consultas para provedores
        providers: async () => {
            return prisma.provider.findMany({
                orderBy: { name: 'asc' }
            });
        },
        provider: async (_, args) => {
            return prisma.provider.findUnique({
                where: { id: args.id }
            });
        }
    },
    Mutation: {
        // Mutações para ordens
        createOrder: async (_, args) => {
            const { transaction_id, service_id, target_username, quantity, attributes } = args;
            try {
                // Verificar se o serviço existe
                const service = await prisma.service.findUnique({
                    where: { id: service_id }
                });
                if (!service) {
                    throw new graphql_1.GraphQLError('Serviço não encontrado');
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
            }
            catch (error) {
                console.error('Erro ao criar ordem:', error);
                throw new graphql_1.GraphQLError('Erro ao criar ordem');
            }
        },
        updateOrder: async (_, args) => {
            const { id, status, notes } = args;
            try {
                // Verificar se a ordem existe
                const existingOrder = await prisma.order.findUnique({
                    where: { id }
                });
                if (!existingOrder) {
                    throw new graphql_1.GraphQLError('Ordem não encontrada');
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
            }
            catch (error) {
                console.error('Erro ao atualizar ordem:', error);
                throw new graphql_1.GraphQLError('Erro ao atualizar ordem');
            }
        }
    }
};
