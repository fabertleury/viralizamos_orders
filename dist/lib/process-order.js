"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOrder = processOrder;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
/**
 * Processa um pedido, enviando-o para o provedor correspondente
 */
async function processOrder(orderId) {
    var _a, _b, _c, _d, _e;
    try {
        // Buscar o pedido completo
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                provider: true
            }
        });
        if (!order) {
            console.error(`Pedido ${orderId} não encontrado`);
            return false;
        }
        // Verificar se já tem um provedor designado
        if (!order.provider_id) {
            // Se não tiver, atribuir um provedor com base no tipo de serviço
            await assignProviderToOrder(orderId);
            // Recarregar o pedido após atribuir o provedor
            const updatedOrder = await prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    provider: true
                }
            });
            if (!updatedOrder || !updatedOrder.provider_id) {
                console.error(`Não foi possível atribuir um provedor ao pedido ${orderId}`);
                // Registrar o erro no log
                await prisma.orderLog.create({
                    data: {
                        order_id: orderId,
                        level: 'error',
                        message: 'Não foi possível atribuir um provedor',
                        data: {}
                    }
                });
                return false;
            }
        }
        // Extrair metadados
        const metadata = order.metadata || {};
        // IMPORTANTE: Usar o external_service_id para o provedor em vez do service_id interno
        const serviceId = order.external_service_id || metadata.external_service_id || order.service_id;
        console.log(`Processando pedido ${orderId} - Serviço (ID externo): ${serviceId}`);
        // Preparar os dados para o provedor
        const providerPayload = {
            key: (_a = order.provider) === null || _a === void 0 ? void 0 : _a.api_key,
            action: 'add',
            service: serviceId, // Usando o ID de serviço do provedor
            link: order.target_url,
            quantity: order.quantity
        };
        console.log(`Enviando para o provedor (${(_b = order.provider) === null || _b === void 0 ? void 0 : _b.name}):`, JSON.stringify(providerPayload));
        // Enviar para o provedor
        const response = await axios_1.default.post(((_c = order.provider) === null || _c === void 0 ? void 0 : _c.api_url) || '', providerPayload);
        // Verificar resposta do provedor
        if (response.data && response.data.order) {
            // Atualizar o pedido com o ID externo e status
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    external_order_id: response.data.order.toString(),
                    status: 'processing',
                    provider_response: response.data
                }
            });
            // Registrar o log
            await prisma.orderLog.create({
                data: {
                    order_id: orderId,
                    level: 'info',
                    message: 'Pedido enviado ao provedor com sucesso',
                    data: {
                        provider: (_d = order.provider) === null || _d === void 0 ? void 0 : _d.name,
                        external_order_id: response.data.order,
                        external_service_id: serviceId
                    }
                }
            });
            return true;
        }
        else {
            // Registrar erro
            await prisma.orderLog.create({
                data: {
                    order_id: orderId,
                    level: 'error',
                    message: 'Resposta inválida do provedor',
                    data: {
                        provider: (_e = order.provider) === null || _e === void 0 ? void 0 : _e.name,
                        response: response.data
                    }
                }
            });
            return false;
        }
    }
    catch (error) {
        console.error(`Erro ao processar pedido ${orderId}:`, error);
        // Registrar erro
        try {
            await prisma.orderLog.create({
                data: {
                    order_id: orderId,
                    level: 'error',
                    message: error instanceof Error ? error.message : 'Erro desconhecido',
                    data: {
                        stack: error instanceof Error ? error.stack : undefined
                    }
                }
            });
        }
        catch (logError) {
            console.error('Erro ao registrar log:', logError);
        }
        return false;
    }
}
/**
 * Atribui um provedor adequado ao pedido
 */
async function assignProviderToOrder(orderId) {
    try {
        // Buscar o pedido
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            return false;
        }
        // Determinar o tipo de serviço com base nos metadados
        const metadata = order.metadata || {};
        const serviceType = metadata.service_type || '';
        const platform = metadata.platform || 'instagram';
        const subType = metadata.sub_type || '';
        console.log(`Atribuindo provedor para pedido ${orderId}. Plataforma: ${platform}, Tipo: ${serviceType}, SubTipo: ${subType}`);
        // Criar condições para a busca de provedor
        let whereConditions = {
            status: true
        };
        // Se temos um tipo de serviço, vamos usar para filtrar provedores adequados
        if (serviceType) {
            whereConditions.OR = [
                {
                    metadata: {
                        path: ['service_types'],
                        array_contains: serviceType
                    }
                }
            ];
        }
        // Se conhecemos a plataforma, adicionamos à condição
        if (platform) {
            if (!whereConditions.OR) {
                whereConditions.OR = [];
            }
            whereConditions.OR.push({
                metadata: {
                    path: ['services'],
                    array_contains: platform
                }
            });
            whereConditions.OR.push({
                metadata: {
                    path: ['primary_service'],
                    equals: platform
                }
            });
        }
        // Buscar provedores que atendem às condições, ordenados por prioridade
        const providers = await prisma.provider.findMany({
            where: whereConditions,
            orderBy: [
                {
                    metadata: {
                        path: ['priority'],
                        sort: 'asc'
                    }
                }
            ]
        });
        if (providers.length === 0) {
            console.error(`Nenhum provedor disponível para o serviço do tipo ${serviceType} na plataforma ${platform}`);
            // Tentar encontrar qualquer provedor ativo como fallback
            const fallbackProvider = await prisma.provider.findFirst({
                where: { status: true }
            });
            if (!fallbackProvider) {
                return false;
            }
            console.log(`Usando provedor fallback: ${fallbackProvider.name}`);
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    provider_id: fallbackProvider.id
                }
            });
            // Registrar log
            await prisma.orderLog.create({
                data: {
                    order_id: orderId,
                    level: 'warning',
                    message: `Provedor fallback ${fallbackProvider.name} atribuído ao pedido`,
                    data: {
                        provider_id: fallbackProvider.id,
                        reason: 'Nenhum provedor especializado disponível'
                    }
                }
            });
            return true;
        }
        // Selecionar o melhor provedor
        // Se tivermos um subTipo específico, verificar se algum provedor é especializado
        let selectedProvider = providers[0]; // Default para o primeiro (maior prioridade)
        if (subType) {
            // Verificar se algum provedor tem recomendação específica para este subtipo
            for (const provider of providers) {
                const metadata = provider.metadata;
                if (metadata.recommended_for && metadata.recommended_for.includes(subType)) {
                    selectedProvider = provider;
                    console.log(`Provedor ${provider.name} selecionado por especialização em ${subType}`);
                    break;
                }
            }
        }
        // Atribuir o provedor ao pedido
        await prisma.order.update({
            where: { id: orderId },
            data: {
                provider_id: selectedProvider.id
            }
        });
        // Registrar log
        await prisma.orderLog.create({
            data: {
                order_id: orderId,
                level: 'info',
                message: `Provedor ${selectedProvider.name} atribuído ao pedido`,
                data: {
                    provider_id: selectedProvider.id,
                    platform,
                    service_type: serviceType,
                    sub_type: subType,
                    selection_reason: subType ? `Especializado em ${subType}` : 'Maior prioridade'
                }
            }
        });
        return true;
    }
    catch (error) {
        console.error(`Erro ao atribuir provedor ao pedido ${orderId}:`, error);
        return false;
    }
}
