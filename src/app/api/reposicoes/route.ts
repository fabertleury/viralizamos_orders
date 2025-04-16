import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enqueueReposicao } from '@/lib/queue';

// GET /api/reposicoes - Listar todas as reposições (admin) ou reposições do usuário (cliente)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
    // Filtragem por ID do pedido
    if (orderId) {
      whereClause.order_id = orderId;
    }
    
    // Filtragem por status
    if (status) {
      whereClause.status = status;
    }
    
    // Se não for admin, mostrar apenas as reposições do usuário logado
    if (session && session.user) {
      if (session.user.role !== 'admin') {
        whereClause.user_id = session.user.id;
      }
    } else {
      // Se não houver sessão, exigir orderId ou retornar erro
      if (!orderId) {
        return NextResponse.json(
          { error: 'É necessário fornecer um ID de pedido para listar reposições sem autenticação' },
          { status: 400 }
        );
      }
    }

    // Buscar reposições
    const [reposicoes, total] = await Promise.all([
      prisma.reposicao.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              target_username: true,
              external_order_id: true,
              service_id: true,
              provider: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { data_solicitacao: 'desc' },
        skip,
        take: limit
      }),
      prisma.reposicao.count({ where: whereClause })
    ]);

    return NextResponse.json({
      reposicoes,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao listar reposições:', error);
    return NextResponse.json(
      { error: 'Erro ao listar reposições' },
      { status: 500 }
    );
  }
}

// POST /api/reposicoes - Criar nova solicitação de reposição
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { order_id, motivo, observacoes } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o pedido para verificar se é válido para reposição
    const order = await prisma.order.findUnique({
      where: { id: order_id }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o pedido está concluído
    if (order.status !== 'completed') {
      return NextResponse.json(
        { error: 'Apenas pedidos concluídos podem ter reposição' },
        { status: 400 }
      );
    }

    // Verificar se já tem mais de 12 horas desde a criação do pedido
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);
    
    if (diffHours < 12) {
      return NextResponse.json(
        { error: 'Só é possível solicitar reposição 12 horas após a compra' },
        { status: 400 }
      );
    }

    // Verificar se está dentro do prazo de 30 dias
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      return NextResponse.json(
        { error: 'O prazo para solicitar reposição (30 dias) foi excedido' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma reposição pendente ou em processamento
    const reposicaoPendente = await prisma.reposicao.findFirst({
      where: {
        order_id,
        status: { in: ['pending', 'processing'] }
      }
    });

    if (reposicaoPendente) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação de reposição pendente para este pedido' },
        { status: 400 }
      );
    }

    // Calcular a data limite (30 dias após a criação do pedido)
    const dataLimite = new Date(orderDate);
    dataLimite.setDate(dataLimite.getDate() + 30);

    // Verificar quantas reposições já foram feitas para incrementar o contador
    const reposicoesAnteriores = await prisma.reposicao.count({
      where: { order_id }
    });

    // Criar a solicitação de reposição
    const reposicao = await prisma.reposicao.create({
      data: {
        order_id,
        user_id: session?.user?.id || order.user_id,
        status: 'pending',
        motivo: motivo || 'Solicitação de reposição pelo cliente',
        observacoes,
        data_limite: dataLimite,
        tentativas: reposicoesAnteriores + 1,
        metadata: {
          ip: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    });

    // Registrar a solicitação no log do pedido
    await prisma.orderLog.create({
      data: {
        order_id,
        level: 'info',
        message: `Solicitação de reposição #${reposicao.id} criada`,
        data: {
          reposicao_id: reposicao.id,
          motivo,
          observacoes,
          user_id: session?.user?.id
        }
      }
    });

    // Adicionar a solicitação à fila de processamento
    try {
      await enqueueReposicao(
        reposicao.id, 
        order_id, 
        session?.user?.id || order.user_id,
        5 // Alta prioridade para reposições solicitadas por clientes
      );
      
      console.log(`Solicitação de reposição #${reposicao.id} adicionada à fila de processamento`);
    } catch (queueError) {
      // Não falhar se a fila não estiver disponível
      console.error('Erro ao adicionar à fila de processamento:', queueError);
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitação de reposição criada com sucesso',
      reposicao
    });
  } catch (error) {
    console.error('Erro ao criar solicitação de reposição:', error);
    return NextResponse.json(
      { error: 'Erro ao criar solicitação de reposição' },
      { status: 500 }
    );
  }
}

// PUT /api/reposicoes/:id - Atualizar status de uma reposição (apenas admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar se é admin
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, resposta } = body;
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reposição é obrigatório' },
        { status: 400 }
      );
    }

    if (!status || !['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
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

    // Atualizar a reposição
    const updatedReposicao = await prisma.reposicao.update({
      where: { id },
      data: {
        status,
        resposta,
        processado_por: session.user.id,
        data_processamento: status === 'pending' ? null : new Date()
      }
    });

    // Registrar a atualização no log do pedido
    await prisma.orderLog.create({
      data: {
        order_id: reposicao.order_id,
        level: 'info',
        message: `Solicitação de reposição #${id} atualizada para ${status}`,
        data: {
          reposicao_id: id,
          status,
          resposta,
          admin_id: session.user.id
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Reposição atualizada com sucesso',
      reposicao: updatedReposicao
    });
  } catch (error) {
    console.error('Erro ao atualizar reposição:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar reposição' },
      { status: 500 }
    );
  }
} 