import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { enqueueReposicao } from '@/lib/queue';

/**
 * Endpoint para criar reposições a partir do transaction_id
 * Esta é uma alternativa ao fluxo padrão, para ser usada quando o cliente
 * não consegue buscar o pedido pelo endpoint /orders/find
 */
export async function POST(request: NextRequest) {
  try {
    const { transaction_id, motivo, observacoes } = await request.json();
    
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
          userAgent: request.headers.get('user-agent') || 'unknown'
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
          observacoes
        }
      }
    });
    
    // Adicionar a reposição à fila de processamento
    try {
      await enqueueReposicao({
        reposicaoId: reposicao.id,
        orderId: order.id,
        userId: order.user_id || undefined,
        priority: 'high' // Prioridade alta para solicitações explícitas do cliente
      });
      
      console.log(`[API] Reposição ${reposicao.id} adicionada à fila de processamento`);
    } catch (queueError) {
      console.error(`[API] Erro ao adicionar reposição ${reposicao.id} à fila:`, queueError);
      // Não falhar a solicitação caso haja erro na fila, apenas registrar o erro
      // A reposição ainda está criada no banco, mas terá que ser processada manualmente
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