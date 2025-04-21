import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Buscar contagens de pedidos por status
    const ordersCountByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Extrair contagens por status
    const statusCounts = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
    };

    ordersCountByStatus.forEach((item) => {
      statusCounts.total += item._count.id;
      
      if (item.status === 'processing' || item.status === 'pending') {
        statusCounts.pending += item._count.id;
      } else if (item.status === 'completed') {
        statusCounts.completed += item._count.id;
      } else if (item.status === 'failed' || item.status === 'error') {
        statusCounts.failed += item._count.id;
      }
    });

    // Buscar total de usuários
    const usersCount = await prisma.user.count();

    // Buscar receita total
    const revenueData = await prisma.order.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'completed',
      },
    });

    // Buscar atividades recentes
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        transaction_id: true,
        status: true,
        created_at: true,
        provider: true,
      },
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
      },
    });

    // Consolidar atividades recentes
    const recentActivity = [
      ...recentOrders.map((order) => ({
        time: order.created_at.toISOString(),
        type: 'order',
        details: `Pedido ${order.transaction_id} - Status: ${order.status}`,
      })),
      ...recentUsers.map((user) => ({
        time: user.created_at.toISOString(),
        type: 'user',
        details: `Novo usuário: ${user.name || user.email}`,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
     .slice(0, 10)
     .map((activity) => ({
       ...activity,
       time: new Date(activity.time).toLocaleString('pt-BR'),
     }));

    return NextResponse.json({
      totalOrders: statusCounts.total,
      pendingOrders: statusCounts.pending,
      completedOrders: statusCounts.completed,
      failedOrders: statusCounts.failed,
      totalUsers: usersCount,
      totalRevenue: revenueData._sum.amount || 0,
      recentActivity,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas do dashboard' },
      { status: 500 }
    );
  }
} 