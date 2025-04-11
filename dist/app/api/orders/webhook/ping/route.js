"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const jsonwebtoken_1 = require("jsonwebtoken");
const client_1 = require("@prisma/client");
// Inicializar Prisma
const prisma = new client_1.PrismaClient();
/**
 * Endpoint para testar a autenticação entre serviços
 * Só responde com sucesso se o token JWT for válido
 */
async function POST(request) {
    console.log('[Webhook Ping] Recebida requisição de teste de autenticação');
    try {
        // Verificar cabeçalho de autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[Webhook Ping] Falha de autenticação: Token não fornecido');
            return server_1.NextResponse.json({ error: 'Credenciais de autenticação não fornecidas' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        console.log('[Webhook Ping] Token recebido:', token.substring(0, 15) + '...');
        try {
            // Verificar token JWT
            const jwtSecret = process.env.JWT_SECRET || 'default_secret';
            const decoded = (0, jsonwebtoken_1.verify)(token, jwtSecret);
            console.log('[Webhook Ping] Token verificado com sucesso, payload:', decoded);
        }
        catch (error) {
            console.error('[Webhook Ping] Falha na verificação do token JWT:', error);
            return server_1.NextResponse.json({ error: 'Token de autenticação inválido' }, { status: 401 });
        }
        // Se chegou até aqui, a autenticação está ok
        // Registrar o teste no log para fins de diagnóstico
        try {
            const body = await request.json();
            await prisma.webhookLog.create({
                data: {
                    webhook_type: 'ping_test',
                    source: 'payment-service',
                    payload: body,
                    processed: true,
                    processed_at: new Date()
                }
            });
            console.log('[Webhook Ping] Teste de ping registrado no log');
        }
        catch (e) {
            console.error('[Webhook Ping] Erro ao registrar ping no log:', e);
            // Continuar mesmo se falhar para registrar no log
        }
        // Responder com sucesso
        return server_1.NextResponse.json({
            success: true,
            message: 'Autenticação bem-sucedida',
            service: 'orders',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Webhook Ping] Erro ao processar requisição de ping:', error);
        return server_1.NextResponse.json({ error: 'Erro interno ao processar requisição de ping' }, { status: 500 });
    }
}
