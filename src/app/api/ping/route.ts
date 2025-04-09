import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de ping simples para verificar se o serviço está online
 * Usado por outros microserviços para testar a conectividade
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'orders',
    timestamp: new Date().toISOString()
  });
} 