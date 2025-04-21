import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'viralizamos-orders-admin-secret-key';

// Validar token JWT e verificar se é admin
const validateAdminToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === 'admin';
  } catch (error) {
    return false;
  }
};

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token')?.value;
    
    if (!token || !validateAdminToken(token)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Parâmetros de paginação e busca
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
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
        created_at: true,
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
            created_at: true,
          },
        });

        // Determinar serviço favorito (o mais comprado)
        const favoriteService = await prisma.$queryRaw`
          SELECT service_id, COUNT(*) as count
          FROM "Order"
          WHERE user_id = ${user.id}
            AND service_id IS NOT NULL
          GROUP BY service_id
          ORDER BY count DESC
          LIMIT 1
        `;

        return {
          ...user,
          orders_count: ordersCount,
          total_spent: totalSpent._sum.amount || 0,
          last_purchase: lastOrder?.created_at || null,
          favorite_service: favoriteService[0]?.service_id || null,
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
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
} 