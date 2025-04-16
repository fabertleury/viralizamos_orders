import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/reposicoes/:id/aprovar ou /api/reposicoes/:id/rejeitar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar se é admin
    if (!session || session.user.role !== 'admin') {
      const authHeader = request.headers.get('authorization');
      
      // Verificar token de API
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Acesso não autorizado' },
          { status: 403 }
        );
      }
      
      const apiKey = authHeader.substring(7);
      const validApiKey = process.env.REPOSICAO_API_KEY;
      
      if (!validApiKey || apiKey !== validApiKey) {
        return NextResponse.json(
          { error: 'API key inválida' },
          { status: 403 }
        );
      }
    }

    const { id, action } = params;
    const body = await request.json();
    const { resposta } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reposição é obrigatório' },
        { status: 400 }
      );
    }

    if (action !== 'aprovar' && action !== 'rejeitar') {
      return NextResponse.json(
        { error: 'Ação inválida. Use "aprovar" ou "rejeitar"' },
        { status: 400 }
      );
    }

    // Buscar a reposição
    const reposicao = await prisma.reposicao.findUnique({
      where: { id }
    });

    if (!reposicao) {
      return NextResponse.json(
        { error: 'Reposição não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a reposição está pendente
    if (reposicao.status !== 'pending') {
      return NextResponse.json(
        { error: `Não é possível ${action} uma reposição que não está pendente` },
        { status: 400 }
      );
    }

    // Atualizar o status da reposição
    const novoStatus = action === 'aprovar' ? 'processing' : 'failed';
    
    const updatedReposicao = await prisma.reposicao.update({
      where: { id },
      data: {
        status: novoStatus,
        resposta,
        processado_por: session?.user?.id || 'system',
        data_processamento: new Date()
      }
    });

    // Registrar no log
    await prisma.orderLog.create({
      data: {
        order_id: reposicao.order_id,
        level: 'info',
        message: `Solicitação de reposição #${id} foi ${action === 'aprovar' ? 'aprovada' : 'rejeitada'}`,
        data: {
          reposicao_id: id,
          action,
          status: novoStatus,
          resposta,
          admin_id: session?.user?.id || 'system'
        }
      }
    });

    // Se foi aprovada, processar a reposição
    if (action === 'aprovar') {
      try {
        // Buscar o pedido original
        const order = await prisma.order.findUnique({
          where: { id: reposicao.order_id },
          include: {
            provider: true
          }
        });

        if (order && order.provider) {
          // Aqui pode entrar a lógica de criação de um novo pedido no provedor
          // se necessário. Depende das regras de negócio e integração.
          // Por enquanto, apenas registramos no log.
          
          await prisma.orderLog.create({
            data: {
              order_id: order.id,
              level: 'info',
              message: `Reposição #${id} aprovada e em processamento`,
              data: {
                reposicao_id: id,
                provider: order.provider.slug,
                service_id: order.service_id,
                target: order.target_username,
                quantity: order.quantity
              }
            }
          });
        }
      } catch (error) {
        console.error(`Erro ao processar reposição #${id}:`, error);
        
        // Registrar o erro, mas não impedir a aprovação
        await prisma.orderLog.create({
          data: {
            order_id: reposicao.order_id,
            level: 'error',
            message: `Erro ao processar reposição #${id} após aprovação`,
            data: {
              error: error instanceof Error ? error.message : String(error),
              reposicao_id: id
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reposição ${action === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`,
      reposicao: updatedReposicao
    });
  } catch (error) {
    console.error(`Erro ao ${params.action} reposição #${params.id}:`, error);
    return NextResponse.json(
      { error: `Erro ao ${params.action} reposição` },
      { status: 500 }
    );
  }
} 