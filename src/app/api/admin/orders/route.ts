import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyApiKey } from '@/lib/auth';

const prisma = new PrismaClient();

// Endpoint para listar pedidos com paginação, filtros e busca
export async function GET(request: NextRequest) {
  try {
    // Verificar se a requisição tem a API key correta
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKey(authHeader)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obter parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { target_username: { contains: search, mode: 'insensitive' } },
        { transaction_id: { contains: search } },
        { external_order_id: { contains: search } },
      ];
    }

    // Adicionar filtro de data, se fornecido
    if (startDate || endDate) {
      where.created_at = {};
      
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.created_at.lte = new Date(endDate);
      }
    }

    // Buscar pedidos e contar total
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          order_logs: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    // Formatar a resposta
    const formattedOrders = orders.map(order => ({
      id: order.id,
      transactionId: order.transaction_id,
      externalServiceId: order.external_service_id,
      externalOrderId: order.external_order_id,
      status: order.status,
      targetUsername: order.target_username,
      targetUrl: order.target_url,
      quantity: order.quantity,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      completedAt: order.completed_at,
      metadata: order.metadata,
      lastLog: order.order_logs?.[0] || null
    }));

    return NextResponse.json({
      data: formattedOrders,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 