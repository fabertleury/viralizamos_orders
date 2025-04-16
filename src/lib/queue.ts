import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';
import axios from 'axios';

// Configuração do Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);
const REPOSICAO_QUEUE = process.env.REPOSICAO_QUEUE || 'reposicao-processing-queue';
const QUEUE_MAX_RETRY_ATTEMPTS = parseInt(process.env.QUEUE_MAX_RETRY_ATTEMPTS || '3', 10);
const QUEUE_BACKOFF_DELAY = parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000', 10); // 5 segundos de base para backoff
const QUEUE_PROCESSING_INTERVAL = parseInt(process.env.QUEUE_PROCESSING_INTERVAL || '60000', 10); // 1 minuto padrão
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '3', 10);

// Interface para os jobs de reposição
interface ReposicaoJob {
  id: string;
  reposicaoId: string;
  orderId: string;
  userId?: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processAfter: string;
}

/**
 * Adiciona uma reposição à fila de processamento
 */
export async function enqueueReposicao(
  reposicaoId: string,
  orderId: string,
  userId?: string,
  options: {
    priority?: number;
    maxAttempts?: number;
    delayMs?: number;
  } = {}
): Promise<ReposicaoJob> {
  // Create a unique job ID
  const jobId = uuidv4();
  
  // Set default options
  const priority = options.priority ?? 0; // Higher number = higher priority
  const maxAttempts = options.maxAttempts ?? QUEUE_MAX_RETRY_ATTEMPTS;
  const delayMs = options.delayMs ?? 0;
  
  // Calculate process after time (for delayed jobs)
  const now = new Date();
  const processAfter = new Date(now.getTime() + delayMs);
  
  // Create the job
  const job: ReposicaoJob = {
    id: jobId,
    reposicaoId,
    orderId,
    userId,
    priority,
    attempts: 0,
    maxAttempts,
    createdAt: now.toISOString(),
    processAfter: processAfter.toISOString(),
  };
  
  // Add the job to Redis
  await redis.zadd(
    REPOSICAO_QUEUE,
    priority, // Score (priority)
    JSON.stringify(job) // Value (job data)
  );
  
  console.log(`[Queue] Adicionado job de reposição à fila: ${jobId} para reposição ${reposicaoId}`);
  
  // Registrar no log
  await prisma.orderLog.create({
    data: {
      order_id: orderId,
      level: 'info',
      message: `Reposição #${reposicaoId} enfileirada para processamento (Job #${jobId})`,
      data: {
        reposicao_id: reposicaoId,
        job_id: jobId,
        priority,
        processAfter: processAfter.toISOString(),
      }
    }
  });
  
  return job;
}

/**
 * Processa jobs da fila de reposições
 */
export async function processReposicaoQueue() {
  console.log(`[Queue] Iniciando processamento da fila de reposições...`);
  
  // Track how many jobs are currently being processed
  let currentlyProcessing = 0;
  const processingPromises: Promise<void>[] = [];
  
  // Process jobs until we reach concurrency limit
  while (currentlyProcessing < QUEUE_CONCURRENCY) {
    // Get the highest priority job that is ready to be processed
    // ZREVRANGE gets items in reverse order (highest score first)
    const jobData = await redis.zrevrange(REPOSICAO_QUEUE, 0, 0);
    
    if (jobData.length === 0) {
      console.log(`[Queue] Não há mais jobs na fila de reposições`);
      break;
    }
    
    try {
      const job: ReposicaoJob = JSON.parse(jobData[0]);
      const now = new Date();
      const processAfter = new Date(job.processAfter);
      
      // Skip if job is not ready to be processed yet
      if (processAfter > now) {
        console.log(`[Queue] Job ${job.id} agendado para processamento futuro: ${job.processAfter}`);
        break;
      }
      
      // Remove the job from the queue
      await redis.zrem(REPOSICAO_QUEUE, jobData[0]);
      
      // Increment attempts
      job.attempts += 1;
      
      // Process the job asynchronously
      currentlyProcessing++;
      
      const processPromise = processReposicaoJob(job)
        .catch(error => {
          console.error(`[Queue] Erro ao processar job ${job.id}:`, error);
          
          // Add job back to queue with backoff if attempts left
          return handleJobFailure(job, error);
        })
        .finally(() => {
          currentlyProcessing--;
        });
      
      processingPromises.push(processPromise);
    } catch (error) {
      console.error(`[Queue] Erro ao analisar dados do job:`, error);
      
      // Remove the invalid job from the queue
      await redis.zrem(REPOSICAO_QUEUE, jobData[0]);
    }
  }
  
  // Wait for all jobs to finish processing
  if (processingPromises.length > 0) {
    await Promise.allSettled(processingPromises);
  }
  
  console.log(`[Queue] Ciclo de processamento da fila de reposições concluído`);
}

/**
 * Process a replenishment job
 * @param job The job to process
 */
async function processReposicaoJob(job: ReposicaoJob): Promise<void> {
  console.log(`[Queue] Processando job ${job.id} para reposição ${job.reposicaoId} (tentativa ${job.attempts}/${job.maxAttempts})`);
  
  try {
    // Check if the replenishment still exists and is in a valid state
    const reposicao = await prisma.reposicao.findUnique({
      where: { id: job.reposicaoId }
    });
    
    if (!reposicao) {
      console.log(`[Queue] Reposição ${job.reposicaoId} não encontrada, job ${job.id} será descartado`);
      return;
    }
    
    if (reposicao.status !== 'pending') {
      console.log(`[Queue] Reposição ${job.reposicaoId} não está mais pendente (status: ${reposicao.status}), job ${job.id} será descartado`);
      return;
    }
    
    // Get API key for authentication
    const apiKey = process.env.REPOSICAO_API_KEY;
    if (!apiKey) {
      throw new Error('REPOSICAO_API_KEY não está configurada no ambiente');
    }
    
    // Call the process endpoint to process the replenishment
    const response = await axios.post(
      `/api/reposicoes/processar`,
      {
        reposicao_id: job.reposicaoId,
        order_id: job.orderId,
        job_id: job.id
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.success) {
      console.log(`[Queue] Job ${job.id} processado com sucesso para reposição ${job.reposicaoId}`);
    } else {
      throw new Error(`Resposta inesperada do processador de reposições: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`[Queue] Falha ao processar job ${job.id} para reposição ${job.reposicaoId}:`, error);
    throw error; // Re-throw to be caught by the handler
  }
}

/**
 * Handle a job failure
 * @param job The failed job
 * @param error The error that occurred
 */
async function handleJobFailure(job: ReposicaoJob, error: any): Promise<void> {
  // Log the failure
  await prisma.orderLog.create({
    data: {
      order_id: job.orderId,
      level: 'error',
      message: `Falha ao processar job ${job.id} para reposição ${job.reposicaoId} (tentativa ${job.attempts}/${job.maxAttempts})`,
      data: {
        job_id: job.id,
        reposicao_id: job.reposicaoId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        attempt: job.attempts,
        maxAttempts: job.maxAttempts
      }
    }
  });
  
  // Check if we should retry
  if (job.attempts < job.maxAttempts) {
    // Calculate backoff delay with exponential increase
    const backoffMs = QUEUE_BACKOFF_DELAY * Math.pow(2, job.attempts - 1);
    const now = new Date();
    const processAfter = new Date(now.getTime() + backoffMs);
    
    job.processAfter = processAfter.toISOString();
    
    // Add the job back to the queue with the same priority
    await redis.zadd(
      REPOSICAO_QUEUE,
      job.priority,
      JSON.stringify(job)
    );
    
    console.log(`[Queue] Job ${job.id} reagendado para processamento em ${backoffMs}ms (${processAfter.toISOString()})`);
  } else {
    console.log(`[Queue] Job ${job.id} atingiu o número máximo de tentativas, marcando como falha permanente`);
    
    // Mark the replenishment as failed in the database
    try {
      await prisma.reposicao.update({
        where: { id: job.reposicaoId },
        data: {
          status: 'failed',
          resposta: `Falha após ${job.maxAttempts} tentativas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          processado_por: 'queue',
          data_processamento: new Date(),
          metadata: {
            job_id: job.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            error_timestamp: new Date().toISOString()
          }
        }
      });
      
      // Log the permanent failure
      await prisma.orderLog.create({
        data: {
          order_id: job.orderId,
          level: 'error',
          message: `Reposição ${job.reposicaoId} falhou permanentemente após ${job.attempts} tentativas`,
          data: {
            job_id: job.id,
            reposicao_id: job.reposicaoId,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            last_error: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        }
      });
    } catch (dbError) {
      console.error(`[Queue] Erro ao atualizar status da reposição ${job.reposicaoId} no banco de dados:`, dbError);
    }
  }
}

/**
 * Inicia o processador da fila como um serviço em background
 */
export function startQueueProcessor(options: {
  intervalMs?: number;
  processImmediately?: boolean;
} = {}) {
  const intervalMs = options.intervalMs || QUEUE_PROCESSING_INTERVAL;
  const processImmediately = options.processImmediately !== false;
  
  console.log(`[Queue] Iniciando processador de fila de reposições com intervalo de ${intervalMs}ms`);
  
  // Process immediately if requested
  if (processImmediately) {
    processReposicaoQueue().catch(error => {
      console.error(`[Queue] Erro no primeiro processamento da fila:`, error);
    });
  }
  
  // Set up interval for periodic processing
  const intervalId = setInterval(() => {
    processReposicaoQueue().catch(error => {
      console.error(`[Queue] Erro no processamento periódico da fila:`, error);
    });
  }, intervalMs);
  
  // Return function to stop the processor
  return () => {
    console.log(`[Queue] Parando processador de fila de reposições`);
    clearInterval(intervalId);
  };
} 