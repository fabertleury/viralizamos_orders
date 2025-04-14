import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyApiKey } from '@/lib/auth';

const prisma = new PrismaClient();

// Endpoint para buscar detalhes de um pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se a requisição tem a API key correta
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKey(authHeader)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = params.id;

    // Buscar o pedido com os logs
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        order_logs: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Formatar a resposta
    const formattedOrder = {
      id: order.id,
      transactionId: order.transaction_id,
      externalServiceId: order.external_service_id,
      externalOrderId: order.external_order_id,
      status: order.status,
      targetUsername: order.target_username,
      targetUrl: order.target_url,
      quantity: order.quantity,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      completedAt: order.completed_at,
      metadata: order.metadata,
      logs: order.order_logs.map(log => ({
        id: log.id,
        level: log.level,
        message: log.message,
        data: log.data,
        createdAt: log.created_at
      }))
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar um pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se a requisição tem a API key correta
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKey(authHeader)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = params.id;
    const body = await request.json();
    const { status, notes } = body;

    // Verificar se o pedido existe
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Atualizar dados do pedido
    const updateData: any = {
      updated_at: new Date()
    };

    if (status) {
      updateData.status = status;

      // Se o status for "completed", atualizar a data de conclusão
      if (status === 'completed' && !existingOrder.completed_at) {
        updateData.completed_at = new Date();
      }
    }

    // Atualizar o pedido
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData
    });

    // Registrar o log de atualização
    await prisma.orderLog.create({
      data: {
        order_id: id,
        level: 'info',
        message: notes || `Status atualizado para: ${status}`,
        data: { previousStatus: existingOrder.status, newStatus: status }
      }
    });

    return NextResponse.json({
      message: 'Order updated successfully',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updated_at,
        completedAt: updatedOrder.completed_at
      }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 