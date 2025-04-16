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
    const body = await request.json();
    const { transaction_id, motivo, observacoes } = body;
    
    // Validar campos obrigatórios
    if (!transaction_id) {
      return NextResponse.json(
        { error: 'ID da transação é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!motivo) {
      return NextResponse.json(
        { error: 'Motivo da reposição é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar o pedido pelo ID da transação
    const order = await prisma.order.findUnique({
      where: { transaction_id },
      include: {
        reposicoes: {
          where: {
            status: {
              in: ['pending', 'processing']
            }
          }
        }
      }
    });
    
    if (!order) {
      console.log(`Pedido não encontrado para transaction_id: ${transaction_id}`);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Pedido encontrado: ${order.id}, status: ${order.status}`);
    
    // Verificar se o pedido está concluído
    if (order.status !== 'completed') {
      console.log(`Pedido ${order.id} não está concluído (status: ${order.status})`);
      return NextResponse.json(
        { error: 'Reposição só pode ser solicitada para pedidos concluídos' },
        { status: 400 }
      );
    }
    
    // Verificar se já existe uma reposição pendente para este pedido
    if (order.reposicoes.length > 0) {
      console.log(`Já existe reposição pendente para o pedido ${order.id}: ${order.reposicoes[0].id}`);
      return NextResponse.json(
        { 
          error: 'Já existe uma reposição pendente para este pedido',
          reposicao_id: order.reposicoes[0].id
        },
        { status: 400 }
      );
    }
    
    // Verificar se passou o tempo mínimo desde a conclusão do pedido (normalmente 24h)
    const completedAt = order.completed_at || order.updated_at;
    if (completedAt) {
      const hoursElapsed = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60);
      console.log(`Horas desde a conclusão do pedido: ${hoursElapsed.toFixed(2)}`);
      
      // Se não passou 24h, não permitir reposição
      if (hoursElapsed < 24) {
        return NextResponse.json(
          { 
            error: 'É necessário aguardar 24 horas após a conclusão do pedido para solicitar reposição',
            hours_elapsed: Math.floor(hoursElapsed),
            hours_remaining: Math.ceil(24 - hoursElapsed)
          },
          { status: 400 }
        );
      }
    }
    
    // Obter informações do usuário que está fazendo a solicitação
    const token = await getToken({ req: request });
    const userId = token?.sub;
    
    // Criar nova reposição
    const reposicao = await prisma.reposicao.create({
      data: {
        order_id: order.id,
        status: 'pending',
        motivo,
        observacoes,
        solicitado_por: userId || 'system',
        data_solicitacao: new Date(),
        metadata: {
          source: 'transaction-api',
          transaction_id
        }
      }
    });
    
    console.log(`Reposição criada: ${reposicao.id} para o pedido ${order.id}`);
    
    // Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: order.id,
        message: `Reposição solicitada via API de transação: ${motivo}`,
        level: 'info',
        data: {
          reposicao_id: reposicao.id,
          transaction_id,
          motivo,
          observacoes
        }
      }
    });
    
    // Enfileirar a reposição para processamento assíncrono com alta prioridade
    try {
      const job = await enqueueReposicao(reposicao.id, order.id, undefined, 10); // Alta prioridade (10)
      
      console.log(`Reposição ${reposicao.id} enfileirada para processamento, job_id: ${job.id}`);
      
      // Atualizar o metadata da reposição com o ID do job
      await prisma.reposicao.update({
        where: { id: reposicao.id },
        data: {
          metadata: {
            ...reposicao.metadata,
            job_id: job.id
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Reposição solicitada com sucesso',
        reposicao_id: reposicao.id,
        job_id: job.id
      });
    } catch (error) {
      console.error('Erro ao enfileirar reposição:', error);
      
      // Ainda retornar sucesso, mas informar que será processada manualmente
      return NextResponse.json({
        success: true,
        message: 'Reposição solicitada com sucesso (será processada manualmente)',
        reposicao_id: reposicao.id,
        queue_error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  } catch (error) {
    console.error('Erro ao processar solicitação de reposição:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de reposição' },
      { status: 500 }
    );
  }
} 