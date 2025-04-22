import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

/// Validar API Key
const validateApiKey = (apiKey: string) => {
  return apiKey === API_KEY;
};

// Endpoint para listar usuários com métricas detalhadas
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

    // Parâmetros de paginação e busca
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    
    // Calcular offset para paginação
    const skip = (page - 1) * limit;

    // Preparar filtros
    let whereClause: any = {};

    // Filtrar por termo de busca
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtrar por tipo de usuário
    if (role) {
      whereClause.role = role;
    }

    // Buscar usuários
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Buscar informações adicionais para cada usuário
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // Contar total de pedidos
        const ordersCount = await prisma.order.count({
          where: {
            user_id: user.id,
          },
        });

        // Calcular total gasto
        const totalSpent = await prisma.order.aggregate({
          where: {
            user_id: user.id,
            status: 'completed',
          },
          _sum: {
            amount: true,
          },
        });

        // Buscar último pedido
        const lastOrder = await prisma.order.findFirst({
          where: {
            user_id: user.id,
          },
          orderBy: {
            created_at: 'desc',
          },
          select: {
            id: true,
            created_at: true,
            status: true,
            amount: true,
          },
        });

        // Buscar serviços mais comprados
        const topServices = await prisma.$queryRaw`
          SELECT 
            COALESCE(p.name, 'Serviço não especificado') as service_name,
            COUNT(*) as count
          FROM "Order" o
          LEFT JOIN "Provider" p ON o.provider_id = p.id
          WHERE o.user_id = ${user.id}
          GROUP BY service_name
          ORDER BY count DESC
          LIMIT 3
        `;

        // Calcular frequência de compras (média de dias entre compras)
        const purchaseFrequency = await prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN COUNT(*) <= 1 THEN NULL
              ELSE EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400 / NULLIF(COUNT(*) - 1, 0)
            END as avg_days_between_purchases
          FROM "Order"
          WHERE user_id = ${user.id}
        `;

        // Calcular valor médio de compra
        const avgOrderValue = await prisma.$queryRaw`
          SELECT AVG(amount) as avg_value
          FROM "Order"
          WHERE user_id = ${user.id} AND amount > 0
        `;

        return {
          ...user,
          metrics: {
            orders_count: ordersCount,
            total_spent: totalSpent._sum.amount || 0,
            last_purchase: lastOrder ? {
              id: lastOrder.id,
              date: lastOrder.created_at,
              status: lastOrder.status,
              amount: lastOrder.amount
            } : null,
            top_services: topServices,
            purchase_frequency: purchaseFrequency[0]?.avg_days_between_purchases,
            avg_order_value: avgOrderValue[0]?.avg_value || 0
          }
        };
      })
    );

    // Contar total para paginação
    const totalUsers = await prisma.user.count({
      where: whereClause,
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(totalUsers / limit);

    return NextResponse.json({
      users: enhancedUsers,
      page,
      totalPages,
      totalItems: totalUsers,
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
