import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obter dados dos últimos 6 meses
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(today.getMonth() - 6);
    startDate.setDate(1); // Primeiro dia do mês
    
    // Buscar todos os pedidos dos últimos 6 meses
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
        },
      },
      select: {
        created_at: true,
        amount: true,
        status: true,
      },
    });
    
    // Criar mapeamentos por mês
    const months = [];
    const ordersPerMonth = [];
    const revenuePerMonth = [];
    
    // Gerar os últimos 6 meses
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(today.getMonth() - 5 + i);
      
      const monthString = date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
      months.push(monthString);
      
      // Inicializar contadores para este mês
      ordersPerMonth.push(0);
      revenuePerMonth.push(0);
    }
    
    // Agrupar pedidos por mês
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const monthDiff = (today.getFullYear() - orderDate.getFullYear()) * 12 + 
                         today.getMonth() - orderDate.getMonth();
      
      // Verificar se o pedido está dentro dos últimos 6 meses
      if (monthDiff >= 0 && monthDiff < 6) {
        const index = 5 - monthDiff;
        
        // Contar apenas pedidos concluídos para receita
        if (order.status === 'completed') {
          revenuePerMonth[index] += Number(order.amount || 0);
        }
        
        // Contar todos os pedidos
        ordersPerMonth[index]++;
      }
    });
    
    return NextResponse.json({
      labels: months,
      datasets: [
        {
          label: 'Pedidos',
          data: ordersPerMonth,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
        },
        {
          label: 'Receita (R$)',
          data: revenuePerMonth,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
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