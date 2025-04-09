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
 * Endpoint de verificação de saúde do serviço de orders
 * Retorna status e informações sobre o serviço
 */
export async function GET() {
  try {
    // Verificar conexão com o banco de dados
    const dbStatus = await checkDatabaseConnection();
    
    // Construir resposta com dados do sistema
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbStatus.connected,
        message: dbStatus.message
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao verificar saúde do serviço:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Verifica a conexão com o banco de dados
 */
async function checkDatabaseConnection() {
  try {
    // Tentar executar uma consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    return {
      connected: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
} 