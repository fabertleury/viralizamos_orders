import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transaction_id');
    const externalOrderId = searchParams.get('external_order_id');
    const orderId = searchParams.get('id');

    // Pelo menos um parâmetro é necessário
    if (!transactionId && !externalOrderId && !orderId) {
      return NextResponse.json(
        { error: 'É necessário fornecer transaction_id, external_order_id ou id para buscar um pedido' },
        { status: 400 }
      );
    }

    // Construir a consulta de busca
    const whereClause: any = {};
    
    if (orderId) {
      whereClause.id = orderId;
    }
    
    if (transactionId) {
      whereClause.transaction_id = transactionId;
    }
    
    if (externalOrderId) {
      whereClause.external_order_id = externalOrderId;
    }

    // Buscar a ordem
    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            api_url: true
          }
        },
        logs: {
          orderBy: {
            created_at: 'desc'
          },
          take: 10
        },
        reposicoes: {
          orderBy: {
            data_solicitacao: 'desc'
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedido' },
      { status: 500 }
    );
  }
} 