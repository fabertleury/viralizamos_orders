import axios from 'axios';
import { logger } from './logger';

/**
 * Atualiza o metadata de uma transação no serviço de pagamentos
 * Esta função é chamada quando um pedido é processado com sucesso
 */
export async function updateTransactionMetadata(
  transactionId: string, 
  orderId: string, 
  providerResponse: any
): Promise<boolean> {
  try {
    // URL do endpoint de atualização de transações
    const url = `${process.env.APP_URL || 'https://orders.viralizamos.com'}/api/orders/update-transaction`;
    
    // Dados para atualizar o metadata da transação
    const data = {
      transaction_id: transactionId,
      order_id: orderId,
      provider_response: providerResponse
    };
    
    // Cabeçalhos da requisição
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ORDERS_API_KEY || ''
    };
    
    // Enviar a requisição
    logger.info('Atualizando metadata da transação', { transactionId, orderId });
    const response = await axios.post(url, data, { headers });
    
    // Verificar resposta
    if (response.data && response.data.success) {
      logger.info('Metadata da transação atualizado com sucesso', { 
        transactionId, 
        orderId, 
        response: response.data 
      });
      return true;
    } else {
      logger.warn('Falha ao atualizar metadata da transação', { 
        transactionId, 
        orderId, 
        response: response.data 
      });
      return false;
    }
  } catch (error) {
    logger.error('Erro ao atualizar metadata da transação', { 
      transactionId, 
      orderId, 
      error 
    });
    return false;
  }
}
