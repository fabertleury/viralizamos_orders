import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

// Configuração do Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redisUrl);

// Nome da fila de reposições
const REPOSICAO_QUEUE = process.env.REPOSICAO_QUEUE || 'reposicao-processing-queue';

// Estrutura do Job de reposição
interface ReposicaoJob {
  id: string;
  reposicaoId: string;
  orderId: string;
  userId?: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processAfter?: string;
}

/**
 * Adiciona um job de processamento de reposição à fila
 * @param reposicaoId ID da reposição a ser processada
 * @param orderId ID do pedido associado à reposição
 * @param userId ID do usuário que solicitou a reposição (opcional)
 * @param priority Prioridade do job (menor = maior prioridade)
 * @returns O job criado
 */
export async function enqueueReposicao(
  reposicaoId: string,
  orderId: string,
  userId?: string,
  priority: number = 10
): Promise<ReposicaoJob> {
  // Criar o job de reposição
  const job: ReposicaoJob = {
    id: uuidv4(),
    reposicaoId,
    orderId,
    userId,
    priority,
    attempts: 0,
    maxAttempts: Number(process.env.QUEUE_MAX_RETRY_ATTEMPTS || 3),
    createdAt: new Date().toISOString(),
  };

  // Adicionar o job à fila de prioridade no Redis
  await redisClient.zadd(
    REPOSICAO_QUEUE,
    priority, // Score (prioridade)
    JSON.stringify(job) // Valor (job serializado)
  );

  console.log(`[Queue] Job de reposição ${job.id} adicionado à fila para reposição ${reposicaoId}`);
  return job;
}

/**
 * Processa os jobs de reposição na fila
 * Deve ser chamado periodicamente por um scheduler ou cron job
 */
export async function processReposicaoQueue() {
  console.log('[Queue] Iniciando processamento da fila de reposições...');

  // Buscar jobs de maior prioridade (menor score) na fila
  // ZRANGE com pontuação (WITHSCORES) permite ver a prioridade
  // Processar até 5 jobs por vez
  const jobsWithScores = await redisClient.zrange(REPOSICAO_QUEUE, 0, 4, 'WITHSCORES');

  // Se não houver jobs, retornar
  if (jobsWithScores.length === 0) {
    console.log('[Queue] Nenhum job de reposição na fila');
    return;
  }

  // Processar os jobs obtidos (o array vem no formato [job1, score1, job2, score2, ...])
  for (let i = 0; i < jobsWithScores.length; i += 2) {
    const jobStr = jobsWithScores[i];
    const job: ReposicaoJob = JSON.parse(jobStr);

    console.log(`[Queue] Processando job de reposição ${job.id} (Tentativa ${job.attempts + 1}/${job.maxAttempts})`);

    try {
      // Remover o job da fila para impedir processamento duplicado
      await redisClient.zrem(REPOSICAO_QUEUE, jobStr);

      // Buscar a reposição no banco de dados
      const reposicao = await prisma.reposicao.findUnique({
        where: { id: job.reposicaoId },
        include: {
          order: {
            include: { provider: true }
          }
        }
      });

      if (!reposicao) {
        console.error(`[Queue] Reposição ${job.reposicaoId} não encontrada`);
        continue;
      }

      // Verificar se a reposição já foi processada
      if (reposicao.status !== 'pending') {
        console.log(`[Queue] Reposição ${job.reposicaoId} já foi processada (status: ${reposicao.status})`);
        continue;
      }

      // Atualizar o status da reposição para 'processing'
      await prisma.reposicao.update({
        where: { id: job.reposicaoId },
        data: {
          status: 'processing',
          data_processamento: new Date()
        }
      });

      // Registrar o log
      await prisma.orderLog.create({
        data: {
          order_id: job.orderId,
          level: 'info',
          message: `Processando reposição #${job.reposicaoId}`,
          data: {
            job_id: job.id,
            attempts: job.attempts + 1
          }
        }
      });

      // Verificar se o pedido tem ID externo (necessário para reposição)
      if (!reposicao.order.external_order_id) {
        throw new Error('Pedido sem ID externo no provedor');
      }

      // Lógica para processar a reposição
      // Integrações com provedores externos, etc.
      
      // Aqui seria implementada a lógica específica de cada provedor
      // Exemplo: integração com um provedor de mídia social
      
      // Para fins de demonstração, estamos apenas simulando o processamento bem-sucedido
      
      // Atualizar a reposição para 'completed'
      await prisma.reposicao.update({
        where: { id: job.reposicaoId },
        data: {
          status: 'completed',
          resposta: 'Reposição processada com sucesso',
          data_processamento: new Date()
        }
      });

      // Registrar o log de sucesso
      await prisma.orderLog.create({
        data: {
          order_id: job.orderId,
          level: 'info',
          message: `Reposição #${job.reposicaoId} processada com sucesso`,
          data: {
            job_id: job.id
          }
        }
      });

      console.log(`[Queue] Job de reposição ${job.id} processado com sucesso`);
    } catch (error) {
      console.error(`[Queue] Erro ao processar job de reposição ${job.id}:`, error);

      // Incrementar o número de tentativas
      job.attempts += 1;

      // Se ainda não atingiu o máximo de tentativas, recolocar na fila com atraso
      if (job.attempts < job.maxAttempts) {
        // Calcular o atraso baseado no número de tentativas (backoff exponencial)
        const backoffDelay = Number(process.env.QUEUE_BACKOFF_DELAY || 5000) * Math.pow(2, job.attempts - 1);
        const processAfter = new Date(Date.now() + backoffDelay).toISOString();
        
        job.processAfter = processAfter;
        
        // Recolocar na fila com prioridade mais baixa (score mais alto)
        await redisClient.zadd(
          REPOSICAO_QUEUE,
          job.priority + job.attempts, // Aumentar score a cada tentativa
          JSON.stringify(job)
        );

        console.log(`[Queue] Job de reposição ${job.id} recolocado na fila. Próxima tentativa após ${new Date(processAfter).toLocaleString()}`);
      } else {
        // Falhou todas as tentativas, marcar como falha
        try {
          await prisma.reposicao.update({
            where: { id: job.reposicaoId },
            data: {
              status: 'failed',
              resposta: error instanceof Error 
                ? error.message 
                : 'Erro desconhecido ao processar reposição',
              data_processamento: new Date()
            }
          });

          // Registrar o log de falha
          await prisma.orderLog.create({
            data: {
              order_id: job.orderId,
              level: 'error',
              message: `Falha ao processar reposição #${job.reposicaoId} após ${job.maxAttempts} tentativas`,
              data: {
                job_id: job.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              }
            }
          });

          console.log(`[Queue] Reposição ${job.reposicaoId} marcada como falha após ${job.maxAttempts} tentativas`);
        } catch (dbError) {
          console.error(`[Queue] Erro ao atualizar status da reposição ${job.reposicaoId}:`, dbError);
        }
      }
    }
  }
}

/**
 * Inicia o processador de fila como um serviço em background
 * @returns Uma função para parar o processador
 */
export function startQueueProcessor() {
  console.log('[Queue] Iniciando processador de fila de reposições');
  
  const interval = Number(process.env.QUEUE_PROCESSING_INTERVAL || 60000); // Default: 1 minuto
  const processIntervalId = setInterval(processReposicaoQueue, interval);
  
  // Executar uma vez imediatamente
  processReposicaoQueue().catch(err => {
    console.error('[Queue] Erro no processamento inicial da fila:', err);
  });
  
  return () => {
    console.log('[Queue] Parando processador de fila de reposições');
    clearInterval(processIntervalId);
  };
} 