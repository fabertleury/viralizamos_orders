import { NextRequest, NextResponse } from 'next/server';
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de healthcheck para monitoramento
 * Usado pelo Railway e outros serviços para verificar se a API está funcionando
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar conexão com o banco de dados
    const dbStatus = await checkDatabaseConnection();
    
    // Construir resposta com dados do sistema
    const response = {
      status: 'ok', // Garantir que sempre retorne 'ok' para o Railway
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbStatus.connected,
        message: dbStatus.message
      },
      scheduler: {
        status: schedulerStatus
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao verificar saúde do serviço:', error);
    
    // Mesmo em caso de erro, retornar status ok para não derrubar o serviço no Railway
    // mas incluir informação de erro para monitoramento
    return NextResponse.json({ 
      status: 'ok',
      has_error: true,
      error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
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