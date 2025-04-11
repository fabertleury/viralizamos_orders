"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@prisma/client");
// Inicializar Prisma
const prisma = new client_1.PrismaClient();
/**
 * Endpoint para criar pedidos a partir do sistema de pagamentos
 * Esta rota é chamada pelo processador de fila do sistema de pagamentos
 */
async function POST(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        // Verificar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return server_1.NextResponse.json({ error: 'Credenciais de autenticação não fornecidas', success: false }, { status: 401 });
        }
        const token = authHeader.substring(7);
        try {
            // Verificar token JWT (comentado para testes iniciais, descomente em produção)
            // verify(token, process.env.JWT_SECRET || 'default_secret');
        }
        catch (error) {
            return server_1.NextResponse.json({ error: 'Token de autenticação inválido', success: false }, { status: 401 });
        }
        // Parse request body
        const body = await request.json();
        console.log('[Orders Create] Recebida solicitação para criar pedido:', body.transaction_id);
        // Validate required fields
        if (!body.transaction_id || !body.service_id || !body.target_username) {
            console.error('[Orders Create] Dados incompletos na solicitação:', {
                transaction_id: body.transaction_id,
                service_id: body.service_id,
                target_username: body.target_username
            });
            return server_1.NextResponse.json({ error: 'Dados incompletos na solicitação', success: false }, { status: 400 });
        }
        // Verificar duplicidade - se já existe um pedido com este transaction_id
        // Se tiver dados de post, considerar também isso para evitar duplicidade
        const whereClause = {
            transaction_id: body.transaction_id
        };
        // Se tiver dados de post, adicionar condições mais específicas
        if (body.post_data) {
            // Se temos dados de post, verificamos de forma mais granular
            if (body.post_data.post_id || body.post_data.post_code) {
                // Usar o OR para verificar se existe pedido com o mesmo post ID ou post code
                whereClause.OR = [
                    {
                        metadata: {
                            path: ['post_id'],
                            equals: body.post_data.post_id
                        }
                    },
                    {
                        metadata: {
                            path: ['post_code'],
                            equals: body.post_data.post_code
                        }
                    }
                ];
                // Incluir também verificação de URL quando disponível
                if (body.post_data.post_url) {
                    whereClause.OR.push({
                        target_url: body.post_data.post_url
                    });
                }
                console.log(`[Orders Create] Verificando duplicidade para post específico: ${body.post_data.post_code || body.post_data.post_id}`);
            }
            else if (body.external_payment_id) {
                // Se não temos post ID/code, mas temos ID de pagamento externo específico para o post
                whereClause.metadata = {
                    path: ['payment_id'],
                    equals: body.external_payment_id
                };
                console.log(`[Orders Create] Verificando duplicidade por payment_id específico: ${body.external_payment_id}`);
            }
        }
        const existingOrders = await prisma.order.findMany({
            where: whereClause
        });
        if (existingOrders.length > 0) {
            console.log(`[Orders Create] Já existem ${existingOrders.length} pedidos para esta transação/post ${body.transaction_id}`);
            return server_1.NextResponse.json({
                message: 'Pedido já processado anteriormente',
                existingOrders: existingOrders.map(o => o.id),
                order_id: existingOrders[0].id,
                success: true
            });
        }
        // Verificar se o usuário já existe ou criar um novo
        let user = null;
        if (body.customer_email) {
            // Buscar usuário pelo email
            user = await prisma.user.findUnique({
                where: { email: body.customer_email }
            });
            if (!user) {
                // Criar novo usuário
                try {
                    user = await prisma.user.create({
                        data: {
                            email: body.customer_email,
                            name: body.customer_name || 'Cliente',
                            phone: body.customer_phone || null,
                            role: 'customer'
                        }
                    });
                    console.log(`[Orders Create] Novo usuário criado com ID: ${user.id} e email: ${user.email}`);
                }
                catch (userError) {
                    console.error('[Orders Create] Erro ao criar usuário:', userError);
                }
            }
            else {
                console.log(`[Orders Create] Usuário existente encontrado com ID: ${user.id} e email: ${user.email}`);
            }
        }
        else {
            console.log('[Orders Create] Dados de cliente não fornecidos, pedido será criado sem associação a usuário');
        }
        try {
            // Criar o pedido
            const order = await prisma.order.create({
                data: {
                    transaction_id: body.transaction_id,
                    service_id: body.service_id,
                    external_service_id: body.external_service_id,
                    provider_id: body.provider_id || null, // ID do provedor de serviços
                    external_order_id: body.external_order_id || null, // ID do pedido no sistema do provedor
                    status: 'pending',
                    amount: body.amount || 0,
                    quantity: body.quantity || 100,
                    target_username: body.target_username,
                    target_url: ((_a = body.post_data) === null || _a === void 0 ? void 0 : _a.post_url) || body.target_url || `https://instagram.com/${body.target_username}`,
                    customer_name: body.customer_name || null,
                    customer_email: body.customer_email || null,
                    user_id: (user === null || user === void 0 ? void 0 : user.id) || null,
                    metadata: {
                        payment_id: body.external_payment_id,
                        service_type: ((_b = body.payment_data) === null || _b === void 0 ? void 0 : _b.service_type) || 'instagram',
                        external_service_id: body.external_service_id,
                        payment_method: (_c = body.payment_data) === null || _c === void 0 ? void 0 : _c.method,
                        payment_status: (_d = body.payment_data) === null || _d === void 0 ? void 0 : _d.status,
                        // Incluir dados específicos do post, se existirem
                        post_id: ((_e = body.post_data) === null || _e === void 0 ? void 0 : _e.post_id) || null,
                        post_code: ((_f = body.post_data) === null || _f === void 0 ? void 0 : _f.post_code) || null,
                        post_type: ((_g = body.post_data) === null || _g === void 0 ? void 0 : _g.post_type) || null,
                        is_reel: ((_h = body.post_data) === null || _h === void 0 ? void 0 : _h.is_reel) || false,
                        // Dados de provedor específicos
                        provider_id: body.provider_id || null,
                        provider_name: body.provider_name || null,
                        external_order_data: body.external_order_data || null,
                        // Incluir dados adicionais recebidos
                        created_at: new Date().toISOString(),
                        source: 'payment-processor'
                    }
                }
            });
            console.log(`[Orders Create] Pedido criado com ID: ${order.id}`);
            // Registrar log
            await prisma.orderLog.create({
                data: {
                    order_id: order.id,
                    level: 'info',
                    message: 'Pedido criado a partir do sistema de pagamentos',
                    data: {
                        transaction_id: body.transaction_id,
                        source: 'payment-system'
                    }
                }
            });
            // Retornar resposta de sucesso
            return server_1.NextResponse.json({
                success: true,
                message: 'Pedido criado com sucesso',
                order_id: order.id
            });
        }
        catch (orderError) {
            console.error('[Orders Create] Erro ao criar pedido:', orderError);
            return server_1.NextResponse.json({ error: 'Falha ao criar pedido', details: String(orderError), success: false }, { status: 500 });
        }
    }
    catch (error) {
        console.error('Erro ao processar solicitação de criação de pedido:', error);
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro desconhecido ao criar pedido',
            success: false
        }, { status: 500 });
    }
}
