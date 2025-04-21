import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Buscar os 10 pedidos mais recentes
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        transaction_id: true,
        customer_email: true,
        amount: true,
        status: true,
        created_at: true,
        provider: true,
      },
    });

    return NextResponse.json(recentOrders);
  } catch (error) {
    console.error('Erro ao buscar pedidos recentes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos recentes' },
      { status: 500 }
    );
  }
} 