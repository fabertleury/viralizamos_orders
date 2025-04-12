import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { createSupabaseClient } from '../utils/supabase-client';

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
      // Se não tiver provedor, buscar do Supabase usando o service_id armazenado nos metadados ou o external_service_id
      const metadata = order.metadata as any || {};
      const supabaseServiceId = metadata.service_id_supabase;
      await fetchAndAssignProviderFromSupabase(orderId, supabaseServiceId, order.external_service_id);
      
      // Recarregar o pedido após atribuir o provedor
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          provider: true
        }
      });
      
      if (!updatedOrder || !updatedOrder.provider_id) {
        console.error(`Não foi possível encontrar um provedor para o pedido ${orderId}`);
        
        // Registrar o erro no log
        await prisma.orderLog.create({
          data: {
            order_id: orderId,
            level: 'error',
            message: 'Não foi possível encontrar um provedor para o serviço',
            data: {
              service_id_supabase: supabaseServiceId,
              external_service_id: order.external_service_id
            }
          }
        });
        
        return false;
      }
    }

    // Extrair metadados
    const metadata = order.metadata as any || {};
    
    // Verificar se há informações de usuário nos metadados e atualizar o user_id se necessário
    if (!order.user_id && (metadata.customer_id || metadata.user_id)) {
      const userId = metadata.customer_id || metadata.user_id;
      console.log(`Atualizando user_id para o pedido ${orderId}: ${userId}`);
      
      // Verificar se o usuário existe ou criar um novo
      let user = null;
      
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId }
        });
      }
      
      // Se não encontrou pelo ID mas temos o email, buscar pelo email
      if (!user && metadata.customer_email) {
        user = await prisma.user.findUnique({
          where: { email: metadata.customer_email }
        });
        
        // Se ainda não existe e temos email, criar usuário
        if (!user && metadata.customer_email) {
          try {
            user = await prisma.user.create({
              data: {
                email: metadata.customer_email,
                name: metadata.customer_name || order.customer_name || 'Cliente',
                role: 'customer'
              }
            });
            console.log(`Usuário criado com ID: ${user.id} para o pedido ${orderId}`);
          } catch (userError) {
            console.error(`Erro ao criar usuário para o pedido ${orderId}:`, userError);
          }
        }
      }
      
      // Se temos um usuário, atualizar o pedido
      if (user) {
        await prisma.order.update({
          where: { id: orderId },
          data: { user_id: user.id }
        });
        console.log(`Pedido ${orderId} atualizado com user_id: ${user.id}`);
      }
    }
    
    // IMPORTANTE: Usar o external_service_id para o provedor
    const serviceId = order.external_service_id || metadata.external_service_id;
    
    if (!serviceId) {
      console.error(`Pedido ${orderId} não possui external_service_id necessário para processamento`);
      
      await prisma.orderLog.create({
        data: {
          order_id: orderId,
          level: 'error',
          message: 'Pedido não possui external_service_id necessário',
          data: {
            order_id: orderId
          }
        }
      });
      
      return false;
    }
    
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
 * Busca o provedor no Supabase e o associa ao pedido
 */
async function fetchAndAssignProviderFromSupabase(orderId: string, serviceId?: string, externalServiceId?: string): Promise<boolean> {
  try {
    // Se não temos um service_id para consultar, não podemos continuar
    if (!serviceId && !externalServiceId) {
      console.error('Não é possível buscar o provedor sem service_id_supabase ou external_service_id');
      return false;
    }
    
    console.log(`Buscando provedor no Supabase para serviço ID: ${serviceId || externalServiceId}`);
    
    // Criar cliente Supabase
    const supabase = createSupabaseClient();
    
    // Consultar o serviço no Supabase
    let serviceQuery = supabase.from('services').select('id, name, provider_id, external_id');
    
    // Usar o ID apropriado para a consulta
    if (serviceId) {
      serviceQuery = serviceQuery.eq('id', serviceId);
    } else if (externalServiceId) {
      serviceQuery = serviceQuery.eq('external_id', externalServiceId);
    }
    
    const { data: serviceData, error: serviceError } = await serviceQuery.single();
    
    if (serviceError || !serviceData) {
      console.error('Erro ao buscar serviço no Supabase:', serviceError);
      return false;
    }
    
    // Verificar se o serviço tem provider_id
    if (!serviceData.provider_id) {
      console.error(`Serviço encontrado, mas sem provider_id: ${serviceData.id} - ${serviceData.name}`);
      return false;
    }
    
    // Buscar provedor no Supabase
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('id, name, api_key, api_url, status')
      .eq('id', serviceData.provider_id)
      .single();
      
    if (providerError || !providerData) {
      console.error('Erro ao buscar provedor no Supabase:', providerError);
      return false;
    }
    
    // Verificar se o provedor já existe no banco local
    let localProvider = await prisma.provider.findUnique({
      where: { id: providerData.id }
    });
    
    // Se não existir, criar o provedor no banco local
    if (!localProvider) {
      console.log(`Criando provedor local para ${providerData.name} (${providerData.id})`);
      
      localProvider = await prisma.provider.create({
        data: {
          id: providerData.id,
          name: providerData.name,
          slug: providerData.name.toLowerCase().replace(/\s+/g, '-'),
          api_key: providerData.api_key || '',
          api_url: providerData.api_url || '',
          status: providerData.status
        }
      });
    }
    
    // Vincular o provedor ao pedido e atualizar os metadados
    const orderData = await prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true }
    });

    // Converter o metadata do JSON para objeto e depois voltar para JSON
    const existingMetadata = orderData?.metadata ? { ...(orderData.metadata as any) } : {};

    await prisma.order.update({
      where: { id: orderId },
      data: {
        provider_id: localProvider.id,
        external_service_id: serviceData.external_id,
        metadata: {
          ...existingMetadata,
          service_id_supabase: serviceData.id,
          service_name: serviceData.name,
          external_service_id: serviceData.external_id
        }
      }
    });
    
    // Registrar log
    await prisma.orderLog.create({
      data: {
        order_id: orderId,
        level: 'info',
        message: 'Provedor atribuído a partir do Supabase',
        data: {
          provider_id: localProvider.id,
          provider_name: localProvider.name,
          service_id_supabase: serviceData.id,
          external_service_id: serviceData.external_id
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao buscar provedor do Supabase:', error);
    return false;
  }
} 