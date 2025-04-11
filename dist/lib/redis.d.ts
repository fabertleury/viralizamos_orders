import { Redis } from 'ioredis';
declare const redis: Redis;
/**
 * Adiciona um job à fila de processamento
 * @param queueName Nome da fila
 * @param data Dados do job
 * @returns ID do job na fila
 */
export declare function addToQueue(queueName: string, data: any): Promise<string>;
/**
 * Processa um job da fila
 * @param queueName Nome da fila
 * @param timeout Tempo máximo de espera em segundos
 * @returns Dados do job ou null se o timeout expirar
 */
export declare function processFromQueue(queueName: string, timeout?: number): Promise<any | null>;
/**
 * Adiciona um pedido à fila de processamento
 * @param orderId ID do pedido
 * @returns ID do job na fila
 */
export declare function queueOrderProcessing(orderId: string): Promise<string>;
/**
 * Adiciona uma verificação de status à fila
 * @param orderId ID do pedido
 * @returns ID do job na fila
 */
export declare function queueStatusCheck(orderId: string): Promise<string>;
export { redis };
