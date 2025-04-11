"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
/**
 * Endpoint de ping simples para verificar se o serviço está online
 * Usado por outros microserviços para testar a conectividade
 */
async function GET(request) {
    return server_1.NextResponse.json({
        status: 'ok',
        service: 'orders',
        timestamp: new Date().toISOString()
    });
}
