import { NextRequest, NextResponse } from 'next/server';
/**
 * Rota para importar provedores do sistema principal
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    imported: number;
    results: any[];
}>>;
