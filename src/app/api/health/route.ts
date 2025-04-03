import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Inicializar Prisma
const prisma = new PrismaClient();

/**
 * Rota para verificar a saúde do serviço
 */
export async function GET() {
  try {
    // Verificar conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;
    
    // Retornar status OK
    return NextResponse.json({
      status: 'healthy',
      service: 'orders-service',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Erro no health check:', error);
    
    // Retornar erro indicando problema com o banco de dados
    return NextResponse.json({
      status: 'unhealthy',
      service: 'orders-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 