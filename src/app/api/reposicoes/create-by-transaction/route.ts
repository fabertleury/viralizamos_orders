import { prisma } from '@/lib/prisma';
import { getToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { enqueueReposicao } from '@/lib/queue';

/**
 * Endpoint para criar reposições a partir do transaction_id
 * Esta é uma alternativa ao fluxo padrão, para ser usada quando o cliente
 * não consegue buscar o pedido pelo endpoint /orders/find
 */
export async function POST(request: NextRequest) {
  try {
    const { transaction_id, motivo, observacoes, external_service_id } = await request.json();
    
    if (!transaction_id) {
      return NextResponse.json(
        { error: 'É necessário fornecer o transaction_id para criar a reposição' },
        { status: 400 }
      );
    }
    
    if (!motivo) {
      return NextResponse.json(
        { error: 'É necessário fornecer o motivo para criar a reposição' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Buscando pedido pelo transaction_id: ${transaction_id}`);
    
    // Buscar o pedido pelo transaction_id
    const order = await prisma.order.findFirst({
      where: { 
        transaction_id 
      }
    });
    
    if (!order) {
      console.error(`[API] Pedido não encontrado para o transaction_id: ${transaction_id}`);
      return NextResponse.json(
        { error: 'Pedido não encontrado para o transaction_id fornecido' },
        { status: 404 }
      );
    }
    
    console.log(`[API] Pedido encontrado: ${order.id}`);
    
    // Se o external_service_id foi fornecido e o pedido não tem um, atualizar
    if (external_service_id && !order.external_service_id) {
      console.log(`[API] Atualizando external_service_id do pedido ${order.id} para: ${external_service_id}`);
      
      // Atualizar o pedido com o external_service_id fornecido
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          external_service_id 
        }
      });
      
      // Registrar no log do pedido
      await prisma.orderLog.create({
        data: {
          order_id: order.id,
          level: 'info',
          message: `External service ID atualizado: ${external_service_id}`,
          data: {
            previous_external_service_id: order.external_service_id,
            new_external_service_id: external_service_id,
            source: 'reposicao_api'
          }
        }
      });
    } else if (!order.external_service_id && !external_service_id) {
      // Avisar se não há external_service_id
      console.warn(`[API] Atenção: Pedido ${order.id} não possui external_service_id para reposição`);
    }
    
    // Verificar se o pedido já foi concluído
    if (order.status !== 'completed') {
      console.warn(`[API] Pedido ${order.id} não está com status 'completed', atual: ${order.status}`);
      
      // Podemos optar por permitir ou não a reposição para pedidos não concluídos
      // Por enquanto, vamos permitir, mas logando um aviso
    }
    
    // Verificar se já existe uma reposição pendente para este pedido
    const existingReposicao = await prisma.reposicao.findFirst({
      where: {
        order_id: order.id,
        status: {
          in: ['pending', 'processing']
        }
      }
    });
    
    if (existingReposicao) {
      console.log(`[API] Já existe uma reposição pendente para o pedido ${order.id}: ${existingReposicao.id}`);
      
      return NextResponse.json({
        success: true,
        message: 'Já existe uma reposição pendente para este pedido',
        reposicao: existingReposicao
      });
    }
    
    // Calcular a data limite (30 dias após a criação do pedido)
    const dataLimite = new Date(order.created_at);
    dataLimite.setDate(dataLimite.getDate() + 30);
    
    // Criar a reposição
    console.log(`[API] Criando reposição para o pedido ${order.id}`);
    
    const reposicao = await prisma.reposicao.create({
      data: {
        order_id: order.id,
        user_id: order.user_id,
        status: 'pending',
        motivo,
        observacoes: observacoes || '',
        data_solicitacao: new Date(),
        data_limite: dataLimite,
        tentativas: 1,
        metadata: {
          source: 'transaction_id_api',
          ip: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          provided_external_service_id: external_service_id || null
        }
      }
    });
    
    console.log(`[API] Reposição criada com sucesso: ${reposicao.id}`);
    
    // Registrar a criação da reposição nos logs do pedido
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        level: 'info',
        message: `Solicitação de reposição criada: ${reposicao.id}`,
        data: {
          reposicao_id: reposicao.id,
          motivo,
          observacoes,
          external_service_id: order.external_service_id || external_service_id || null
        }
      }
    });
    
    // Adicionar à fila de processamento
    try {
      await enqueueReposicao(
        reposicao.id,
        order.id,
        order.user_id,
        5 // Prioridade média (5) para reposições via API
      );
      
      console.log(`Solicitação de reposição #${reposicao.id} adicionada à fila de processamento`);
    } catch (queueError) {
      // Não falhar se a fila não estiver disponível
      console.error('Erro ao adicionar à fila de processamento:', queueError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Reposição criada com sucesso e adicionada à fila de processamento',
      reposicao
    });
    
  } catch (error) {
    console.error('[API] Erro ao criar reposição:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: 'Não foi possível criar a reposição'
      },
      { status: 500 }
    );
  }
} 