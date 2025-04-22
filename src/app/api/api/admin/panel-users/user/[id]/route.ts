import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || process.env.ORDERS_API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

/// Validar API Key - mesma função do endpoint principal
const validateApiKey = (authHeader: string | null) => {
  if (!authHeader) return false;
  
  // Log para debug
  console.log('Auth header recebido:', authHeader);
  
  let apiKey: string | null = null;
  
  // Extrair o token dependendo do formato
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader.startsWith('ApiKey ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader.startsWith('Token ')) {
    apiKey = authHeader.substring(6);
  } else {
    // Considerar que pode ser apenas a chave direta
    apiKey = authHeader;
  }
  
  // Verificar chaves válidas
  const validApiKeys = [
    API_KEY,
    process.env.ORDERS_API_KEY,
    'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284',
    process.env.API_KEY
  ].filter(Boolean) as string[];
  
  console.log('API Key extraída:', apiKey);
  console.log('Chaves válidas a verificar:', validApiKeys.length);
  
  // Verificar se a chave extraída é válida
  return validApiKeys.includes(apiKey);
};

// Endpoint para obter os detalhes de um usuário específico pelo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    console.log(`Endpoint panel-users/user/${userId} acessado:`, request.url);
    
    // Verificar autenticação via API key no header
    const authHeader = request.headers.get('Authorization');
    
    // Verificar autenticação
    if (!validateApiKey(authHeader)) {
      console.error('Erro de autenticação:', authHeader);
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key inválida ou não fornecida' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuário não fornecido' },
        { status: 400 }
      );
    }

    // Buscar o usuário pelo ID
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Usuário encontrado: ${user.email}`);

    // Buscar informações adicionais do usuário (métricas)
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

    // Montar o objeto de resposta
    const detailedUser = {
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

    return NextResponse.json(detailedUser);
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 