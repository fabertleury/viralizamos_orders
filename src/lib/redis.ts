import { Redis } from 'ioredis';

// URL de conexão do Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://default:QaDMKufNqdRynhdFJHovvXTdLtVTeNIy@switchback.proxy.rlwy.net:59407';

// Criar a instância do Redis
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Manipulador de erros
redis.on('error', (err) => {
  console.error('Erro na conexão Redis:', err);
});

// Manipulador de reconexão
redis.on('reconnecting', () => {
  console.log('Reconectando ao Redis...');
});

// Manipulador de conexão bem-sucedida
redis.on('connect', () => {
  console.log('Conexão Redis estabelecida');
});

/**
 * Adiciona um job à fila de processamento
 * @param queueName Nome da fila
 * @param data Dados do job
 * @returns ID do job na fila
 */
export async function addToQueue(queueName: string, data: any): Promise<string> {
  const jobId = `job:${queueName}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  const jobData = JSON.stringify({ id: jobId, data, createdAt: new Date() });
  
  await redis.lpush(`queue:${queueName}`, jobData);
  console.log(`Job adicionado à fila ${queueName}:`, jobId);
  
  return jobId;
}

/**
 * Processa um job da fila
 * @param queueName Nome da fila
 * @param timeout Tempo máximo de espera em segundos
 * @returns Dados do job ou null se o timeout expirar
 */
export async function processFromQueue(queueName: string, timeout = 5): Promise<any | null> {
  const result = await redis.brpop(`queue:${queueName}`, timeout);
  
  if (!result) {
    return null;
  }
  
  const [_, jobData] = result;
  const job = JSON.parse(jobData);
  console.log(`Job obtido da fila ${queueName}:`, job.id);
  
  return job;
}

/**
 * Adiciona um pedido à fila de processamento
 * @param orderId ID do pedido
 * @returns ID do job na fila
 */
export async function queueOrderProcessing(orderId: string): Promise<string> {
  return addToQueue('order_processing', { orderId });
}

/**
 * Adiciona uma verificação de status à fila
 * @param orderId ID do pedido
 * @returns ID do job na fila
 */
export async function queueStatusCheck(orderId: string): Promise<string> {
  return addToQueue('status_check', { orderId });
}

export { redis }; 