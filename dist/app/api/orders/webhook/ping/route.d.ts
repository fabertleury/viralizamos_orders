import { NextRequest, NextResponse } from 'next/server';
/**
 * Endpoint para testar a autenticação entre serviços
 * Só responde com sucesso se o token JWT for válido
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    service: string;
    timestamp: string;
}>>;
