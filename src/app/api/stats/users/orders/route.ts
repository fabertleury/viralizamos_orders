import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/stats/users/orders
 * Obter estatísticas de pedidos por usuário (usado pelo painel administrativo)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (opcional, pois a rota pode ser pública para o painel)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.warn('Requisição sem cabeçalho de autorização');
    }

    // Obter lista de emails do corpo da requisição
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Lista de emails inválida ou vazia' },
        { status: 400 }
      );
    }

    // Limitar a quantidade de emails para evitar sobrecarga
    const limitedEmails = emails.slice(0, 100);

    // Buscar usuários por email
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: limitedEmails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Criar mapa de emails para IDs de usuário
    const userIdMap = new Map(users.map((user) => [user.email, user.id]));

    // Resultados por email
    const result: Record<string, any> = {};

    // Para cada email encontrado, buscar estatísticas de pedidos
    for (const email of limitedEmails) {
      const userId = userIdMap.get(email);

      if (!userId) {
        // Usuário não encontrado
        result[email] = {
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: null,
          servicos: [],
        };
        continue;
      }

      // Contar total de pedidos
      const totalPedidos = await prisma.order.count({
        where: {
          user_id: userId,
        },
      });

      // Calcular total gasto
      const totalGasto = await prisma.order.aggregate({
        where: {
          user_id: userId,
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      });

      // Buscar último pedido
      const ultimoPedido = await prisma.order.findFirst({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          created_at: true,
        },
      });

      // Buscar serviços mais utilizados
      const servicos = await prisma.$queryRaw`
        SELECT service_id, COUNT(*) as count
        FROM "Order"
        WHERE user_id = ${userId}
          AND service_id IS NOT NULL
        GROUP BY service_id
        ORDER BY count DESC
        LIMIT 5
      `;

      // Adicionar resultado ao mapa
      result[email] = {
        total_pedidos: totalPedidos,
        total_gasto: totalGasto._sum.amount || 0,
        ultimo_pedido: ultimoPedido?.created_at || null,
        servicos: servicos || [],
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de pedidos por usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de pedidos' },
      { status: 500 }
    );
  }
} 