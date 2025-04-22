import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

// Validar API Key
const validateApiKey = (apiKey: string) => {
  return apiKey === API_KEY;
};

// Endpoint para obter detalhes de um usuário específico
// Específico para o painel administrativo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = params.id;
    
    // Buscar o usuário pelo ID
    const user = await prisma.user.findUnique({
      where: {
        id: id
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar pedidos do usuário
    const orders = await prisma.order.findMany({
      where: {
        user_id: id
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10,
      include: {
        provider: true
      }
    });

    // Calcular métricas detalhadas
    const totalOrders = await prisma.order.count({
      where: {
        user_id: id
      }
    });

    const totalSpent = await prisma.order.aggregate({
      where: {
        user_id: id,
        status: 'completed'
      },
      _sum: {
        amount: true
      }
    });

    // Buscar serviços mais comprados
    const topServices = await prisma.$queryRaw`
      SELECT 
        COALESCE(p.name, 'Serviço não especificado') as service_name,
        COUNT(*) as count,
        SUM(o.amount) as total_spent
      FROM "Order" o
      LEFT JOIN "Provider" p ON o.provider_id = p.id
      WHERE o.user_id = ${id}
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT 5
    `;

    // Calcular distribuição de status dos pedidos
    const statusDistribution = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM "Order"
      WHERE user_id = ${id}
      GROUP BY status
      ORDER BY count DESC
    `;

    // Calcular tendência de compras por mês nos últimos 6 meses
    const purchaseTrend = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as order_count,
        SUM(amount) as total_amount
      FROM "Order"
      WHERE user_id = ${id}
        AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month DESC
    `;

    // Calcular valor médio de compra
    const avgOrderValue = await prisma.$queryRaw`
      SELECT AVG(amount) as avg_value
      FROM "Order"
      WHERE user_id = ${id} AND amount > 0
    `;

    // Calcular tempo médio entre compras
    const avgTimeBetweenPurchases = await prisma.$queryRaw`
      WITH ordered_purchases AS (
        SELECT 
          created_at,
          LAG(created_at) OVER (ORDER BY created_at) as prev_purchase
        FROM "Order"
        WHERE user_id = ${id}
        ORDER BY created_at
      )
      SELECT 
        AVG(EXTRACT(EPOCH FROM (created_at - prev_purchase)) / 86400) as avg_days
      FROM ordered_purchases
      WHERE prev_purchase IS NOT NULL
    `;

    return NextResponse.json({
      user: {
        ...user,
        recent_orders: orders,
        metrics: {
          total_orders: totalOrders,
          total_spent: totalSpent._sum.amount || 0,
          top_services: topServices,
          status_distribution: statusDistribution,
          purchase_trend: purchaseTrend,
          avg_order_value: avgOrderValue[0]?.avg_value || 0,
          avg_days_between_purchases: avgTimeBetweenPurchases[0]?.avg_days || null
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes do usuário', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
