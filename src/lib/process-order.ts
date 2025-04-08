import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Processa um pedido, enviando-o para o provedor correspondente
 */
export async function processOrder(orderId: string): Promise<boolean> {
  try {
    // Buscar o pedido completo
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provider: true
      }
    });

    if (!order) {
      console.error(`Pedido ${orderId} não encontrado`);
      return false;
    }

    // Verificar se já tem um provedor designado
    if (!order.provider_id) {
      // Se não tiver, atribuir um provedor com base no tipo de serviço
      await assignProviderToOrder(orderId);
      
      // Recarregar o pedido após atribuir o provedor
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          provider: true
        }
      });
      
      if (!updatedOrder || !updatedOrder.provider_id) {
        console.error(`Não foi possível atribuir um provedor ao pedido ${orderId}`);
        
        // Registrar o erro no log
        await prisma.orderLog.create({
          data: {
            order_id: orderId,
            level: 'error',
            message: 'Não foi possível atribuir um provedor',
            data: {}
          }
        });
        
        return false;
      }
    }

    // Extrair metadados
    const metadata = order.metadata as any || {};
    
    // IMPORTANTE: Usar o external_service_id para o provedor em vez do service_id interno
    const serviceId = order.external_service_id || metadata.external_service_id || order.service_id;
    
    console.log(`Processando pedido ${orderId} - Serviço (ID externo): ${serviceId}`);

    // Preparar os dados para o provedor
    const providerPayload = {
      key: order.provider?.api_key,
      action: 'add',
      service: serviceId, // Usando o ID de serviço do provedor
      link: order.target_url,
      quantity: order.quantity
    };
    
    console.log(`Enviando para o provedor (${order.provider?.name}):`, JSON.stringify(providerPayload));

    // Enviar para o provedor
    const response = await axios.post(order.provider?.api_url || '', providerPayload);
    
    // Verificar resposta do provedor
    if (response.data && response.data.order) {
      // Atualizar o pedido com o ID externo e status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          external_order_id: response.data.order.toString(),
          status: 'processing',
          provider_response: response.data
        }
      });
      
      // Registrar o log
      await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level: 'info',
          message: 'Pedido enviado ao provedor com sucesso',
          data: {
            provider: order.provider?.name,
            external_order_id: response.data.order,
            external_service_id: serviceId
          }
        }
      });
      
      return true;
    } else {
      // Registrar erro
      await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level: 'error',
          message: 'Resposta inválida do provedor',
          data: {
            provider: order.provider?.name,
            response: response.data
          }
        }
      });
      
      return false;
    }
  } catch (error) {
    console.error(`Erro ao processar pedido ${orderId}:`, error);
    
    // Registrar erro
    try {
      await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          data: {
            stack: error instanceof Error ? error.stack : undefined
          }
        }
      });
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }
    
    return false;
  }
}

/**
 * Atribui um provedor adequado ao pedido
 */
async function assignProviderToOrder(orderId: string): Promise<boolean> {
  try {
    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return false;
    }
    
    // Determinar o tipo de serviço com base nos metadados
    const metadata = order.metadata as any || {};
    const serviceType = metadata.service_type || 'instagram';
    
    // Buscar um provedor ativo para o tipo de serviço
    const provider = await prisma.provider.findFirst({
      where: {
        status: true,
        // Se houver uma lógica específica para escolher o provedor, aplicá-la aqui
        // Por exemplo, provedores específicos para Instagram
      }
    });
    
    if (!provider) {
      console.error(`Nenhum provedor disponível para o serviço do tipo ${serviceType}`);
      return false;
    }
    
    // Atribuir o provedor ao pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        provider_id: provider.id
      }
    });
    
    // Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: orderId,
        level: 'info',
        message: `Provedor ${provider.name} atribuído ao pedido`,
        data: {
          provider_id: provider.id
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Erro ao atribuir provedor ao pedido ${orderId}:`, error);
    return false;
  }
} 