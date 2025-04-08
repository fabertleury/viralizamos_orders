import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import setupScheduler from '../../../lib/init-scheduler';

// Inicializar Prisma
const prisma = new PrismaClient();

// Inicializar o agendador quando o módulo for carregado
let schedulerInitialized = false;
let schedulerStatus = 'disabled';

try {
  const scheduler = setupScheduler();
  schedulerInitialized = scheduler !== null;
  schedulerStatus = schedulerInitialized ? 'running' : 'disabled';
} catch (error) {
  console.error('Erro ao inicializar o agendador:', error);
  schedulerStatus = 'error';
}

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
      database: 'connected',
      scheduler: schedulerStatus
    });
  } catch (error) {
    console.error('Erro no health check:', error);
    
    // Retornar erro indicando problema com o banco de dados
    return NextResponse.json({
      status: 'unhealthy',
      service: 'orders-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      scheduler: schedulerStatus,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 