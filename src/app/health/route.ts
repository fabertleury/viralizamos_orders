import { NextResponse } from 'next/server';

/**
 * Endpoint de healthcheck para monitoramento
 * Usado pelo Railway e outros serviços para verificar se a API está funcionando
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'viralizamos-orders-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
} 