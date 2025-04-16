import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Endpoint para retornar estatísticas das reposições
 * @route GET /api/reposicoes/stats
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação do usuário
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get('authorization');
    
    // Verificar se é um usuário administrador ou se está utilizando a API key
    if (!session?.user || session.user.role !== 'admin') {
      // Se não for admin, verificar se tem API key válida
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Acesso não autorizado' },
          { status: 403 }
        );
      }
      
      const apiKey = authHeader.substring(7);
      const validApiKey = process.env.REPOSICAO_API_KEY;
      
      if (!validApiKey || apiKey !== validApiKey) {
        return NextResponse.json(
          { error: 'API key inválida' },
          { status: 403 }
        );
      }
    }
    
    // Obter parâmetros para filtragem (período)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, today, week, month
    
    // Definir o filtro de data com base no período selecionado
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = {
        data_solicitacao: {
          gte: startOfDay
        }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Começar do domingo
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = {
        data_solicitacao: {
          gte: startOfWeek
        }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = {
        data_solicitacao: {
          gte: startOfMonth
        }
      };
    }
    
    // Contar reposições por status
    const [
      totalReposicoes,
      pendingReposicoes,
      processingReposicoes,
      completedReposicoes,
      failedReposicoes
    ] = await Promise.all([
      prisma.reposicao.count({
        where: dateFilter
      }),
      prisma.reposicao.count({
        where: {
          ...dateFilter,
          status: 'pending'
        }
      }),
      prisma.reposicao.count({
        where: {
          ...dateFilter,
          status: 'processing'
        }
      }),
      prisma.reposicao.count({
        where: {
          ...dateFilter,
          status: 'completed'
        }
      }),
      prisma.reposicao.count({
        where: {
          ...dateFilter,
          status: 'failed'
        }
      })
    ]);
    
    // Estatísticas de tempo de processamento (apenas para reposições concluídas ou falhadas)
    const processedReposicoes = await prisma.reposicao.findMany({
      where: {
        ...dateFilter,
        status: { in: ['completed', 'failed'] },
        data_processamento: { not: null }
      },
      select: {
        data_solicitacao: true,
        data_processamento: true
      }
    });
    
    // Calcular tempo médio de processamento
    let totalProcessingTime = 0;
    let maxProcessingTime = 0;
    let minProcessingTime = Number.MAX_SAFE_INTEGER;
    
    processedReposicoes.forEach(repo => {
      const processingTime = 
        new Date(repo.data_processamento).getTime() - 
        new Date(repo.data_solicitacao).getTime();
      
      totalProcessingTime += processingTime;
      
      if (processingTime > maxProcessingTime) {
        maxProcessingTime = processingTime;
      }
      
      if (processingTime < minProcessingTime) {
        minProcessingTime = processingTime;
      }
    });
    
    const avgProcessingTimeMs = 
      processedReposicoes.length > 0 ? totalProcessingTime / processedReposicoes.length : 0;
    
    // Se não houver reposições processadas, definir o mínimo como 0
    if (minProcessingTime === Number.MAX_SAFE_INTEGER) {
      minProcessingTime = 0;
    }
    
    // Retornar as estatísticas
    return NextResponse.json({
      success: true,
      stats: {
        period,
        total: totalReposicoes,
        by_status: {
          pending: pendingReposicoes,
          processing: processingReposicoes,
          completed: completedReposicoes,
          failed: failedReposicoes
        },
        processing_time: {
          avg_ms: avgProcessingTimeMs,
          avg_minutes: Math.round(avgProcessingTimeMs / (1000 * 60)),
          min_minutes: Math.round(minProcessingTime / (1000 * 60)),
          max_minutes: Math.round(maxProcessingTime / (1000 * 60))
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de reposições:', error);
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas de reposições' },
      { status: 500 }
    );
  }
} 