import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obter data atual e datas para comparação
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Buscar todos os pedidos para calcular totais
    const orders = await prisma.order.findMany({
      where: {
        status: 'completed',
      },
      select: {
        amount: true,
        created_at: true,
      }
    });

    // Calcular valores
    const total = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const count = orders.length;
    const averageValue = count > 0 ? total / count : 0;

    // Filtrar pedidos por período
    const todayOrders = orders.filter(order => order.created_at >= startOfToday);
    const weekOrders = orders.filter(order => order.created_at >= startOfWeek);
    const monthOrders = orders.filter(order => order.created_at >= startOfMonth);

    // Calcular totais por período
    const today = todayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const week = weekOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const month = monthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      total,
      count,
      averageValue,
      today,
      week,
      month,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de pedidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar resumo de pedidos' },
      { status: 500 }
    );
  }
} 