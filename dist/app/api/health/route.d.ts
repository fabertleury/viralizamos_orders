import { NextResponse } from 'next/server';
/**
 * Endpoint de verificação de saúde do serviço de orders
 * Retorna status e informações sobre o serviço
 */
export declare function GET(): Promise<NextResponse<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
    database: {
        connected: boolean;
        message: string;
    };
    uptime: number;
    memory: NodeJS.MemoryUsage;
}> | NextResponse<{
    status: string;
    message: string;
    timestamp: string;
}>>;
