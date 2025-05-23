import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';
import { processReposicaoQueue, enqueueReposicao } from '@/lib/queue';

// Remove MAIN_SYSTEM_API_URL and API_KEY variables since we're processing directly
// const MAIN_SYSTEM_API_URL = process.env.MAIN_SYSTEM_API_URL || 'https://api.viralizamos.com.br';
// const API_KEY = process.env.API_KEY || 'default-key';

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
    const { reposicao_id, order_id, status, resposta, job_id } = body;

    // Se temos um job_id, então esta chamada está vindo da fila
    const isQueueProcessing = !!job_id;

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

    // Se não está vindo da fila e não é uma solicitação para processar imediatamente,
    // enfileirar para processamento assíncrono
    if (!isQueueProcessing && !body.process_now) {
      try {
        const job = await enqueueReposicao(reposicao.id, reposicao.order_id, session?.user?.id);
        
        return NextResponse.json({
          success: true,
          message: 'Reposição enfileirada para processamento',
          job_id: job.id,
          reposicao_id: reposicao.id
        });
      } catch (error) {
        console.error('Erro ao enfileirar reposição:', error);
        
        // Continuar com o processamento síncrono se falhar o enfileiramento
        console.log('Continuando com processamento síncrono devido a falha na fila');
      }
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
        processado_por: session?.user?.id || (isQueueProcessing ? 'queue' : 'system'),
        data_processamento: new Date()
      }
    });

    // Registrar no log
    await prisma.orderLog.create({
      data: {
        order_id: reposicao.order_id,
        level: 'info',
        message: `Iniciando processamento da reposição #${reposicao.id}${isQueueProcessing ? ' (via fila)' : ''}`,
        data: {
          reposicao_id: reposicao.id,
          processado_por: session?.user?.id || (isQueueProcessing ? 'queue' : 'system'),
          job_id: job_id
        }
      }
    });

    // Processar reposição diretamente no microserviço de orders
    try {
      // Verifica o provedor do pedido para processar a reposição corretamente
      if (!order.provider) {
        throw new Error('Provedor do pedido não encontrado');
      }

      let refillResult;
      
      // Processar baseado no provider_id ou slug do provedor
      if (order.provider.slug === 'smm-panel-a' || order.provider.slug === 'smm-panel-b') {
        // Processar diretamente usando a API do provedor
        refillResult = await processProviderRefill(order, order.provider);
      } else {
        // Provedor não suporta reposição automatizada
        throw new Error(`Provedor ${order.provider.name} não suporta reposição automatizada`);
      }

      // Atualizar a reposição com sucesso
      const updatedReposicao = await prisma.reposicao.update({
        where: { id: reposicao.id },
        data: {
          status: 'completed',
          resposta: 'Reposição criada com sucesso',
          metadata: {
            ...reposicao.metadata,
            refill_id: refillResult.refill_id,
            refill_response: refillResult,
            job_id: job_id
          },
          data_processamento: new Date()
        }
      });

      // Registrar no log
      await prisma.orderLog.create({
        data: {
          order_id: reposicao.order_id,
          level: 'info',
          message: `Reposição #${reposicao.id} processada com sucesso${isQueueProcessing ? ' (via fila)' : ''}`,
          data: {
            reposicao_id: reposicao.id,
            refill_id: refillResult.refill_id,
            processado_por: session?.user?.id || (isQueueProcessing ? 'queue' : 'system'),
            job_id: job_id
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Reposição processada com sucesso',
        reposicao: updatedReposicao,
        refill: refillResult
      });
    } catch (error) {
      console.error('Erro ao processar reposição:', error);
      
      // Atualizar a reposição com falha
      const updatedReposicao = await prisma.reposicao.update({
        where: { id: reposicao.id },
        data: {
          status: 'failed',
          resposta: error instanceof Error ? error.message : 'Erro ao processar reposição',
          metadata: {
            ...reposicao.metadata,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            error_timestamp: new Date().toISOString(),
            job_id: job_id
          },
          data_processamento: new Date()
        }
      });

      // Registrar no log
      await prisma.orderLog.create({
        data: {
          order_id: reposicao.order_id,
          level: 'error',
          message: `Falha ao processar reposição #${reposicao.id}${isQueueProcessing ? ' (via fila)' : ''}`,
          data: {
            reposicao_id: reposicao.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            processado_por: session?.user?.id || (isQueueProcessing ? 'queue' : 'system'),
            job_id: job_id
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

// Função para processar reposição diretamente com o provedor
async function processProviderRefill(order: any, provider: any) {
  // Implemente a lógica específica para cada provedor
  try {
    if (provider.slug === 'smm-panel-a') {
      // Exemplo para SMM Panel A
      const apiUrl = provider.api_url;
      const apiKey = provider.api_key;
      
      const response = await axios.post(apiUrl, {
        key: apiKey,
        action: 'refill',
        order: order.external_order_id
      });
      
      if (response.data && response.data.refill) {
        return {
          success: true,
          refill_id: response.data.refill,
          provider: provider.slug,
          raw_response: response.data
        };
      } else {
        throw new Error(`Resposta inválida do provedor ${provider.slug}`);
      }
    } 
    else if (provider.slug === 'smm-panel-b') {
      // Exemplo para SMM Panel B
      const apiUrl = provider.api_url;
      const apiKey = provider.api_key;
      
      const response = await axios.post(apiUrl, {
        api_key: apiKey,
        method: 'create_refill',
        order_id: order.external_order_id
      });
      
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          refill_id: response.data.refill_id,
          provider: provider.slug,
          raw_response: response.data
        };
      } else {
        throw new Error(`Resposta inválida do provedor ${provider.slug}: ${response.data?.message || 'Sem mensagem'}`);
      }
    }
    
    throw new Error(`Provedor não implementado: ${provider.slug}`);
  } catch (error) {
    console.error(`Erro ao processar reposição com o provedor ${provider.slug}:`, error);
    throw error;
  }
} 