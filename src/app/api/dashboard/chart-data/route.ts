import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obter data atual e data de 30 dias atrás
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Buscar pedidos dos últimos 30 dias
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
        status: 'completed',
      },
      select: {
        amount: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    
    // Criar um mapa para agrupar pedidos por dia
    const dailyOrders = new Map();
    
    // Inicializar mapa com zeros para todos os 30 dias
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dailyOrders.set(dateString, 0);
    }
    
    // Somar valores para cada dia
    orders.forEach(order => {
      const dateString = order.created_at.toISOString().split('T')[0];
      const currentTotal = dailyOrders.get(dateString) || 0;
      dailyOrders.set(dateString, currentTotal + (order.amount || 0));
    });
    
    // Formatar dados para o gráfico
    const labels = Array.from(dailyOrders.keys());
    const data = Array.from(dailyOrders.values());
    
    return NextResponse.json({
      labels,
      datasets: [
        {
          label: 'Vendas',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    });
  } catch (error) {
    console.error('Erro ao buscar dados para o gráfico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados para o gráfico' },
      { status: 500 }
    );
  }
} 