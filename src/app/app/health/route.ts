import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de healthcheck simples para monitoramento
 * Usado pelo Railway para verificar se o serviço está rodando
 */
export async function GET(request: NextRequest) {
  console.log('Health check requisitado (app):', request.url);
  
  return NextResponse.json({
    status: 'ok',
    service: 'viralizamos-orders-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }, { status: 200 });
} 