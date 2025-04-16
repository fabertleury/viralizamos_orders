import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const MAIN_SYSTEM_API_URL = process.env.MAIN_SYSTEM_API_URL || 'https://api.viralizamos.com.br';
const API_KEY = process.env.API_KEY || 'default-key';

// POST /api/reposicoes/processar - Processar uma reposição automaticamente
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { reposicao_id, order_id, status, resposta } = body;

    if (!reposicao_id && !order_id) {
      return NextResponse.json(
        { error: 'ID da reposição ou ID do pedido é obrigatório' },
        { status: 400 }
      );
    }

    let reposicao;

    // Buscar por ID da reposição
    if (reposicao_id) {
      reposicao = await prisma.reposicao.findUnique({
        where: { id: reposicao_id }
      });
    } 
    // Buscar reposição pendente mais antiga pelo ID do pedido
    else if (order_id) {
      reposicao = await prisma.reposicao.findFirst({
        where: {
          order_id,
          status: 'pending'
        },
        orderBy: {
          data_solicitacao: 'asc'
        }
      });
    }

    if (!reposicao) {
      return NextResponse.json(
        { error: 'Reposição não encontrada' },
        { status: 404 }
      );
    }

    // Buscar o pedido original para obter dados necessários para reposição
    const order = await prisma.order.findUnique({
      where: { id: reposicao.order_id },
      include: {
        provider: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o pedido tem ID externo (necessário para reposição)
    if (!order.external_order_id) {
      await prisma.reposicao.update({
        where: { id: reposicao.id },
        data: {
          status: 'failed',
          resposta: 'Pedido sem ID externo no provedor',
          data_processamento: new Date()
        }
      });
      
      return NextResponse.json(
        { error: 'Pedido sem ID externo no provedor' },
        { status: 400 }
      );
    }

    // Atualizar a reposição para status "processing"
    await prisma.reposicao.update({
      where: { id: reposicao.id },
      data: {
        status: 'processing',
        processado_por: session?.user?.id || 'system',
        data_processamento: new Date()
      }
    });

    // Registrar no log
    await prisma.orderLog.create({
      data: {
        order_id: reposicao.order_id,
        level: 'info',
        message: `Iniciando processamento da reposição #${reposicao.id}`,
        data: {
          reposicao_id: reposicao.id,
          processado_por: session?.user?.id || 'system'
        }
      }
    });

    // Integrar com a API do sistema principal para criar a reposição
    try {
      // Conforme exemplos da API, fazer solicitação de reposição
      const refillResponse = await axios.post(`${MAIN_SYSTEM_API_URL}/api/v2`, {
        key: API_KEY,
        action: 'refill',
        order: order.external_order_id
      });

      if (refillResponse.data && refillResponse.data.refill) {
        // Atualizar a reposição com sucesso
        const updatedReposicao = await prisma.reposicao.update({
          where: { id: reposicao.id },
          data: {
            status: 'completed',
            resposta: 'Reposição criada com sucesso',
            metadata: {
              ...reposicao.metadata,
              refill_id: refillResponse.data.refill,
              refill_response: refillResponse.data
            },
            data_processamento: new Date()
          }
        });

        // Registrar no log
        await prisma.orderLog.create({
          data: {
            order_id: reposicao.order_id,
            level: 'info',
            message: `Reposição #${reposicao.id} processada com sucesso`,
            data: {
              reposicao_id: reposicao.id,
              refill_id: refillResponse.data.refill,
              processado_por: session?.user?.id || 'system'
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Reposição processada com sucesso',
          reposicao: updatedReposicao,
          refill: refillResponse.data
        });
      } else {
        throw new Error('Resposta do sistema principal não contém ID da reposição');
      }
    } catch (error) {
      console.error('Erro ao processar reposição no sistema principal:', error);
      
      // Atualizar a reposição com falha
      const updatedReposicao = await prisma.reposicao.update({
        where: { id: reposicao.id },
        data: {
          status: 'failed',
          resposta: error instanceof Error ? error.message : 'Erro ao processar reposição',
          metadata: {
            ...reposicao.metadata,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            error_timestamp: new Date().toISOString()
          },
          data_processamento: new Date()
        }
      });

      // Registrar no log
      await prisma.orderLog.create({
        data: {
          order_id: reposicao.order_id,
          level: 'error',
          message: `Falha ao processar reposição #${reposicao.id}`,
          data: {
            reposicao_id: reposicao.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            processado_por: session?.user?.id || 'system'
          }
        }
      });

      return NextResponse.json({
        success: false,
        message: 'Falha ao processar reposição',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        reposicao: updatedReposicao
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao processar reposição:', error);
    return NextResponse.json(
      { error: 'Erro ao processar reposição' },
      { status: 500 }
    );
  }
} 