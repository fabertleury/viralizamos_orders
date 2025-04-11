import { NextRequest, NextResponse } from 'next/server';
/**
 * Endpoint para processar pedidos pendentes
 * Este endpoint pode ser chamado por um job agendado ou manualmente
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    message: string;
    processed: any[];
}> | NextResponse<{
    processed: number;
    successful: number;
    failed: number;
    orders: any[];
}>>;
