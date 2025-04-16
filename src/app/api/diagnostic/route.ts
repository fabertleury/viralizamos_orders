import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint para diagnóstico do sistema de pedidos
 * @route GET /api/diagnostic
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Opção de diagnóstico
    const option = searchParams.get('option') || 'orders';
    
    // Limitar o acesso usando uma chave de API simples para evitar exposição de dados
    const apiKey = searchParams.get('key');
    
    if (apiKey !== process.env.REPOSICAO_API_KEY) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }
    
    // Mostrar estatísticas de pedidos
    if (option === 'orders') {
      // Buscar os 10 pedidos mais recentes
      const recentOrders = await prisma.order.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          transaction_id: true,
          external_service_id: true,
          external_order_id: true,
          status: true,
          created_at: true
        }
      });
      
      // Buscar estatísticas gerais
      const totalOrders = await prisma.order.count();
      const ordersWithoutTransactionId = await prisma.order.count({
        where: { transaction_id: null }
      });
      const ordersWithoutExternalServiceId = await prisma.order.count({
        where: { external_service_id: null }
      });
      const ordersWithoutExternalOrderId = await prisma.order.count({
        where: { external_order_id: null }
      });
      
      return NextResponse.json({
        success: true,
        stats: {
          totalOrders,
          ordersWithoutTransactionId,
          ordersWithoutExternalServiceId,
          ordersWithoutExternalOrderId,
        },
        recentOrders
      });
    }
    
    // Buscar pedido específico por transaction_id
    if (option === 'find-transaction') {
      const transactionId = searchParams.get('transaction_id');
      
      if (!transactionId) {
        return NextResponse.json({ error: 'Transaction ID não fornecido' }, { status: 400 });
      }
      
      // Buscar pedidos correspondentes ao transaction_id
      const matches = await prisma.order.findMany({
        where: { 
          transaction_id: { contains: transactionId, mode: 'insensitive' }
        },
        include: {
          provider: {
            select: {
              name: true,
              slug: true
            }
          },
          reposicoes: {
            select: {
              id: true,
              status: true,
              motivo: true,
              data_solicitacao: true
            }
          }
        }
      });
      
      // Buscar pedidos semelhantes (pode ajudar a identificar problemas de formatação)
      const similarMatches = await prisma.order.findMany({
        where: {
          transaction_id: {
            contains: transactionId.substring(0, 10),
            mode: 'insensitive'
          }
        },
        take: 5,
        select: {
          id: true,
          transaction_id: true,
          external_service_id: true
        }
      });
      
      return NextResponse.json({
        success: true,
        query: transactionId,
        exactMatches: matches,
        similarMatches: similarMatches.filter(o => o.transaction_id !== transactionId)
      });
    }
    
    // Opção inválida
    return NextResponse.json({ error: 'Opção de diagnóstico inválida' }, { status: 400 });
    
  } catch (error) {
    console.error('[Diagnostic] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
} 