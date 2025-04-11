"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const jsonwebtoken_1 = require("jsonwebtoken");
const scheduler_1 = require("../../../../lib/scheduler");
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
        const { action, queue, limit = 10 } = await request.json();
        if (!action) {
            return server_1.NextResponse.json({ error: 'Ação não especificada' }, { status: 400 });
        }
        // Executar ação solicitada
        switch (action) {
            case 'status':
                // Obter status das filas
                const pendingCounts = await scheduler_1.pendingOrdersQueue.getJobCounts();
                const statusCounts = await scheduler_1.statusCheckQueue.getJobCounts();
                return server_1.NextResponse.json({
                    pendingOrdersQueue: pendingCounts,
                    statusCheckQueue: statusCounts
                });
            case 'run_now':
                // Verificar qual fila deve ser executada
                if (!queue) {
                    return server_1.NextResponse.json({ error: 'Fila não especificada' }, { status: 400 });
                }
                let job;
                // Adicionar job imediato na fila selecionada
                if (queue === 'pending_orders') {
                    job = await scheduler_1.pendingOrdersQueue.add({ limit, manual: true }, { jobId: `manual-${Date.now()}` });
                }
                else if (queue === 'status_check') {
                    job = await scheduler_1.statusCheckQueue.add({ limit, manual: true }, { jobId: `manual-${Date.now()}` });
                }
                else {
                    return server_1.NextResponse.json({ error: `Fila inválida: ${queue}` }, { status: 400 });
                }
                return server_1.NextResponse.json({
                    message: `Job adicionado à fila ${queue}`,
                    jobId: job.id
                });
            case 'clean':
                // Limpar jobs pendentes/atrasados
                if (!queue) {
                    return server_1.NextResponse.json({ error: 'Fila não especificada' }, { status: 400 });
                }
                if (queue === 'pending_orders') {
                    await scheduler_1.pendingOrdersQueue.clean(0, 'delayed');
                    await scheduler_1.pendingOrdersQueue.clean(0, 'wait');
                }
                else if (queue === 'status_check') {
                    await scheduler_1.statusCheckQueue.clean(0, 'delayed');
                    await scheduler_1.statusCheckQueue.clean(0, 'wait');
                }
                else if (queue === 'all') {
                    await scheduler_1.pendingOrdersQueue.clean(0, 'delayed');
                    await scheduler_1.pendingOrdersQueue.clean(0, 'wait');
                    await scheduler_1.statusCheckQueue.clean(0, 'delayed');
                    await scheduler_1.statusCheckQueue.clean(0, 'wait');
                }
                else {
                    return server_1.NextResponse.json({ error: `Fila inválida: ${queue}` }, { status: 400 });
                }
                return server_1.NextResponse.json({
                    message: `Fila ${queue} limpa com sucesso`
                });
            default:
                return server_1.NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
        }
    }
    catch (error) {
        console.error('Erro ao gerenciar agendador:', error);
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro desconhecido ao gerenciar agendador'
        }, { status: 500 });
    }
}
