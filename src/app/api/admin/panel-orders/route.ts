import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

// Validar API Key
const validateApiKey = (apiKey: string) => {
  return apiKey === API_KEY;
};

// Endpoint para listar pedidos com paginação, filtros e busca
// Específico para o painel administrativo
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação via API key no header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key não fornecida' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key inválida' },
        { status: 401 }
      );
    }

    // Parâmetros de paginação e filtros
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const provider_id = searchParams.get('provider_id') || '';
    const start_date = searchParams.get('start_date') || '';
    const end_date = searchParams.get('end_date') || '';

    // Calcular offset para paginação
    const skip = (page - 1) * limit;

    // Preparar filtros
    let whereClause: any = {};
    
    // Filtrar por status, se especificado
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
    
    // Filtrar por provedor, se especificado
    if (provider_id && provider_id !== 'todos') {
      whereClause.provider_id = provider_id;
    }
    
    // Filtrar por data de início, se especificada
    if (start_date) {
      whereClause.created_at = {
        ...(whereClause.created_at || {}),
        gte: new Date(start_date)
      };
    }
    
    // Filtrar por data de fim, se especificada
    if (end_date) {
      whereClause.created_at = {
        ...(whereClause.created_at || {}),
        lte: new Date(end_date)
      };
    }
    
    // Filtrar por termo de busca
    if (search) {
      whereClause.OR = [
        { transaction_id: { contains: search, mode: 'insensitive' } },
        { customer_email: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
        { target_username: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('Buscando pedidos com filtros:', JSON.stringify(whereClause));

    // Buscar pedidos com base nos filtros e paginação
    const orders = await prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        transaction_id: true,
        customer_email: true,
        customer_name: true,
        status: true,
        amount: true,
        quantity: true,
        created_at: true,
        provider_id: true,
        provider: {
          select: {
            id: true,
            name: true,
          }
        },
        service_id: true,
        external_service_id: true,
        target_username: true,
        external_order_id: true,
        user_id: true,
      },
    });

    // Contar total de pedidos para paginação
    const totalOrders = await prisma.order.count({
      where: whereClause,
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(totalOrders / limit);

    return NextResponse.json({
      orders,
      page,
      totalPages,
      totalItems: totalOrders,
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
