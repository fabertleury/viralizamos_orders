import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { processOrder } from '../../../../lib/process-order';
import { verify } from 'jsonwebtoken';

// Inicializar Prisma
const prisma = new PrismaClient();

/**
 * Endpoint para processar pedidos pendentes
 * Este endpoint pode ser chamado por um job agendado ou manualmente
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Credenciais de autenticação não fornecidas' }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    try {
      // Verificar token JWT
      verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido' }, 
        { status: 401 }
      );
    }
    
    // Obter parâmetros da requisição
    const body = await request.json() as {
      limit?: number;
      orderId?: string;
    };
    const { limit = 10, orderId } = body;
    
    // Se um ID específico foi fornecido, processar apenas esse pedido
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!order) {
        return NextResponse.json(
          { error: `Pedido ${orderId} não encontrado` }, 
          { status: 404 }
        );
      }
      
      if (order.status !== 'pending') {
        return NextResponse.json(
          { error: `Pedido ${orderId} não está pendente (status: ${order.status})` }, 
          { status: 400 }
        );
      }
      
      const success = await processOrder(orderId);
      
      return NextResponse.json({
        success,
        processed: [orderId],
        message: success ? 'Pedido processado com sucesso' : 'Falha ao processar pedido'
      });
    }
    
    // Buscar pedidos pendentes
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        created_at: 'asc'
      },
      take: limit,
      select: {
        id: true
      }
    });
    
    if (pendingOrders.length === 0) {
      return NextResponse.json({
        message: 'Não há pedidos pendentes para processar',
        processed: []
      });
    }
    
    // Processar os pedidos
    const results = [];
    
    for (const order of pendingOrders) {
      try {
        const success = await processOrder(order.id);
        results.push({
          id: order.id,
          success
        });
      } catch (error) {
        console.error(`Erro ao processar pedido ${order.id}:`, error);
        results.push({
          id: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    // Registrar processamento em lote
    // Nota: Usando um log temporário até que a migração do Prisma seja feita
    console.log('Resumo do processamento em lote:', {
      type: 'order_processing',
      total_processed: pendingOrders.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    // Comentado até que a migração do Prisma seja concluída
    /*
    await prisma.batchProcessLog.create({
      data: {
        type: 'order_processing',
        total_processed: pendingOrders.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        data: results
      }
    });
    */
    
    return NextResponse.json({
      processed: pendingOrders.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      orders: results
    });
    
  } catch (error) {
    console.error('Erro ao processar pedidos:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar pedidos' 
      }, 
      { status: 500 }
    );
  }
} 