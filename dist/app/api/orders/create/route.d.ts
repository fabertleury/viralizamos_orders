import { NextRequest, NextResponse } from 'next/server';
/**
 * Endpoint para criar pedidos a partir do sistema de pagamentos
 * Esta rota é chamada pelo processador de fila do sistema de pagamentos
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
    success: boolean;
}> | NextResponse<{
    success: boolean;
    message: string;
    order_id: string;
}>>;
