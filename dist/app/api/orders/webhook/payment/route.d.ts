import { NextRequest, NextResponse } from 'next/server';
/**
 * Rota para receber webhooks de pagamento do microserviço de pagamentos
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    message: string;
}>>;
