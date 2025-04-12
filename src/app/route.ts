import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Rota raiz para verificação de saúde
 */
export async function GET(request: NextRequest) {
  console.log('Raiz acessada:', request.url);
  
  return NextResponse.json({
    status: 'ok',
    service: 'viralizamos-orders-api',
    timestamp: new Date().toISOString()
  }, { status: 200 });
} 