import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const validToken = process.env.ORDERS_API_KEY || process.env.REPOSICAO_API_KEY;
    
    if (!validToken || token !== validToken) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 403 }
      );
    }

    // Receber os dados do pedido
    const orderData = await request.json();
    
    const {
      transaction_id,
      external_service_id,
      external_order_id,
      service_id,
      provider_id,
      target_username,
      quantity,
      amount,
      customer_name,
      customer_email,
      status = 'pending'
    } = orderData;
    
    if (!transaction_id) {
      return NextResponse.json(
        { error: 'transaction_id é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!target_username) {
      return NextResponse.json(
        { error: 'target_username é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[Sync] Recebido pedido para sincronização com transaction_id: ${transaction_id}`);
    
    // Verificar se o pedido já existe no banco
    const existingOrder = await prisma.order.findFirst({
      where: {
        transaction_id
      }
    });
    
    if (existingOrder) {
      console.log(`[Sync] Pedido já existe, atualizando: ${existingOrder.id}`);
      
      // Atualizar o pedido existente
      const updatedOrder = await prisma.order.update({
        where: {
          id: existingOrder.id
        },
        data: {
          external_service_id: external_service_id || existingOrder.external_service_id,
          external_order_id: external_order_id || existingOrder.external_order_id,
          service_id: service_id || existingOrder.service_id,
          provider_id: provider_id || existingOrder.provider_id,
          target_username: target_username || existingOrder.target_username,
          quantity: quantity || existingOrder.quantity,
          amount: amount ?? existingOrder.amount,
          customer_name: customer_name || existingOrder.customer_name,
          customer_email: customer_email || existingOrder.customer_email,
          // Não sobrescrever um status completed com pending
          status: existingOrder.status === 'completed' ? existingOrder.status : (status || existingOrder.status),
          updated_at: new Date()
        }
      });
      
      // Registrar no log
      await prisma.orderLog.create({
        data: {
          order_id: existingOrder.id,
          level: 'info',
          message: 'Pedido atualizado via sincronização',
          data: {
            prev_status: existingOrder.status,
            new_status: updatedOrder.status,
            updated_fields: Object.keys(orderData).filter(key => key !== 'transaction_id')
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Pedido atualizado com sucesso',
        order: updatedOrder,
        action: 'updated'
      });
    } else {
      console.log(`[Sync] Pedido não encontrado, criando novo com transaction_id: ${transaction_id}`);
      
      // Criar novo pedido
      const newOrder = await prisma.order.create({
        data: {
          transaction_id,
          external_service_id,
          external_order_id,
          service_id,
          provider_id,
          target_username,
          quantity: quantity || 1,
          amount,
          customer_name,
          customer_email,
          status: status || 'pending',
          metadata: {
            source: 'sync_api',
            synced_at: new Date().toISOString()
          }
        }
      });
      
      // Registrar no log
      await prisma.orderLog.create({
        data: {
          order_id: newOrder.id,
          level: 'info',
          message: 'Pedido criado via sincronização',
          data: {
            transaction_id,
            external_service_id,
            external_order_id
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Pedido criado com sucesso',
        order: newOrder,
        action: 'created'
      });
    }
  } catch (error) {
    console.error('[Sync] Erro:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno',
        details: 'Não foi possível sincronizar o pedido'
      },
      { status: 500 }
    );
  }
} 