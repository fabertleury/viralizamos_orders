"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@prisma/client");
const process_order_1 = require("../../../../lib/process-order");
const jsonwebtoken_1 = require("jsonwebtoken");
// Inicializar Prisma
const prisma = new client_1.PrismaClient();
/**
 * Endpoint para processar pedidos pendentes
 * Este endpoint pode ser chamado por um job agendado ou manualmente
 */
async function POST(request) {
    try {
        // Verificar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return server_1.NextResponse.json({ error: 'Credenciais de autenticação não fornecidas' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        try {
            // Verificar token JWT
            (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET || 'default_secret');
        }
        catch (error) {
            return server_1.NextResponse.json({ error: 'Token de autenticação inválido' }, { status: 401 });
        }
        // Obter parâmetros da requisição
        const { limit = 10, orderId } = await request.json();
        // Se um ID específico foi fornecido, processar apenas esse pedido
        if (orderId) {
            const order = await prisma.order.findUnique({
                where: { id: orderId }
            });
            if (!order) {
                return server_1.NextResponse.json({ error: `Pedido ${orderId} não encontrado` }, { status: 404 });
            }
            if (order.status !== 'pending') {
                return server_1.NextResponse.json({ error: `Pedido ${orderId} não está pendente (status: ${order.status})` }, { status: 400 });
            }
            const success = await (0, process_order_1.processOrder)(orderId);
            return server_1.NextResponse.json({
                success,
                processed: [orderId],
                message: success ? 'Pedido processado com sucesso' : 'Falha ao processar pedido'
            });
        }
        // Buscar pedidos pendentes
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
        if (pendingOrders.length === 0) {
            return server_1.NextResponse.json({
                message: 'Não há pedidos pendentes para processar',
                processed: []
            });
        }
        // Processar os pedidos
        const results = [];
        for (const order of pendingOrders) {
            try {
                const success = await (0, process_order_1.processOrder)(order.id);
                results.push({
                    id: order.id,
                    success
                });
            }
            catch (error) {
                console.error(`Erro ao processar pedido ${order.id}:`, error);
                results.push({
                    id: order.id,
                    success: false,
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        }
        // Registrar processamento em lote
        // Nota: Usando um log temporário até que a migração do Prisma seja feita
        console.log('Resumo do processamento em lote:', {
            type: 'order_processing',
            total_processed: pendingOrders.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        });
        // Comentado até que a migração do Prisma seja concluída
        /*
        await prisma.batchProcessLog.create({
          data: {
            type: 'order_processing',
            total_processed: pendingOrders.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            data: results
          }
        });
        */
        return server_1.NextResponse.json({
            processed: pendingOrders.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            orders: results
        });
    }
    catch (error) {
        console.error('Erro ao processar pedidos:', error);
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro desconhecido ao processar pedidos'
        }, { status: 500 });
    }
}
