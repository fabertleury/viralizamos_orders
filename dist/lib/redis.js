"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.addToQueue = addToQueue;
exports.processFromQueue = processFromQueue;
exports.queueOrderProcessing = queueOrderProcessing;
exports.queueStatusCheck = queueStatusCheck;
const ioredis_1 = require("ioredis");
// URL de conexão do Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://default:QaDMKufNqdRynhdFJHovvXTdLtVTeNIy@switchback.proxy.rlwy.net:59407';
// Criar a instância do Redis
const redis = new ioredis_1.Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
exports.redis = redis;
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
async function addToQueue(queueName, data) {
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
async function processFromQueue(queueName, timeout = 5) {
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
async function queueOrderProcessing(orderId) {
    return addToQueue('order_processing', { orderId });
}
/**
 * Adiciona uma verificação de status à fila
 * @param orderId ID do pedido
 * @returns ID do job na fila
 */
async function queueStatusCheck(orderId) {
    return addToQueue('status_check', { orderId });
}
