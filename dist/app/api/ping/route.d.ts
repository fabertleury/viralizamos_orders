import { NextRequest, NextResponse } from 'next/server';
/**
 * Endpoint de ping simples para verificar se o serviço está online
 * Usado por outros microserviços para testar a conectividade
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    status: string;
    service: string;
    timestamp: string;
}>>;
