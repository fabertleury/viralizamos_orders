import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { pendingOrdersQueue, statusCheckQueue } from '../../../../lib/scheduler';

/**
 * Rota para administração do agendador de tarefas
 * Permite disparar jobs manualmente e verificar o status
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
    const { action, queue, limit = 10 } = await request.json();
    
    if (!action) {
      return NextResponse.json(
        { error: 'Ação não especificada' }, 
        { status: 400 }
      );
    }
    
    // Executar ação solicitada
    switch (action) {
      case 'status':
        // Obter status das filas
        const pendingCounts = await pendingOrdersQueue.getJobCounts();
        const statusCounts = await statusCheckQueue.getJobCounts();
        
        return NextResponse.json({
          pendingOrdersQueue: pendingCounts,
          statusCheckQueue: statusCounts
        });
        
      case 'run_now':
        // Verificar qual fila deve ser executada
        if (!queue) {
          return NextResponse.json(
            { error: 'Fila não especificada' }, 
            { status: 400 }
          );
        }
        
        let job;
        
        // Adicionar job imediato na fila selecionada
        if (queue === 'pending_orders') {
          job = await pendingOrdersQueue.add(
            { limit, manual: true },
            { jobId: `manual-${Date.now()}` }
          );
        } else if (queue === 'status_check') {
          job = await statusCheckQueue.add(
            { limit, manual: true },
            { jobId: `manual-${Date.now()}` }
          );
        } else {
          return NextResponse.json(
            { error: `Fila inválida: ${queue}` }, 
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          message: `Job adicionado à fila ${queue}`,
          jobId: job.id
        });
        
      case 'clean':
        // Limpar jobs pendentes/atrasados
        if (!queue) {
          return NextResponse.json(
            { error: 'Fila não especificada' }, 
            { status: 400 }
          );
        }
        
        if (queue === 'pending_orders') {
          await pendingOrdersQueue.clean(0, 'delayed');
          await pendingOrdersQueue.clean(0, 'wait');
        } else if (queue === 'status_check') {
          await statusCheckQueue.clean(0, 'delayed');
          await statusCheckQueue.clean(0, 'wait');
        } else if (queue === 'all') {
          await pendingOrdersQueue.clean(0, 'delayed');
          await pendingOrdersQueue.clean(0, 'wait');
          await statusCheckQueue.clean(0, 'delayed');
          await statusCheckQueue.clean(0, 'wait');
        } else {
          return NextResponse.json(
            { error: `Fila inválida: ${queue}` }, 
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          message: `Fila ${queue} limpa com sucesso`
        });
        
      default:
        return NextResponse.json(
          { error: `Ação desconhecida: ${action}` }, 
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Erro ao gerenciar agendador:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerenciar agendador' 
      }, 
      { status: 500 }
    );
  }
} 