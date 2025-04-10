import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';

// Inicializar Prisma
const prisma = new PrismaClient();

/**
 * Endpoint para criar pedidos a partir do sistema de pagamentos
 * Esta rota é chamada pelo processador de fila do sistema de pagamentos
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Credenciais de autenticação não fornecidas', success: false }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    try {
      // Verificar token JWT (comentado para testes iniciais, descomente em produção)
      // verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido', success: false }, 
        { status: 401 }
      );
    }
    
    // Obter dados da requisição
    const body = await request.json();
    console.log('[Orders Create] Recebida solicitação para criar pedido:', body.transaction_id);
    
    // Validar dados obrigatórios
    if (!body.transaction_id || !body.service_id || !body.target_username) {
      console.error('[Orders Create] Dados incompletos na solicitação:', { 
        transaction_id: body.transaction_id, 
        service_id: body.service_id, 
        target_username: body.target_username 
      });
      return NextResponse.json(
        { error: 'Dados incompletos na solicitação', success: false }, 
        { status: 400 }
      );
    }
    
    // Verificar duplicidade - se já existe um pedido com este transaction_id
    // Se tiver dados de post, considerar também isso para evitar duplicidade
    const whereClause: any = {
      transaction_id: body.transaction_id
    };
    
    // Se tiver dados de post, adicionar condições mais específicas
    if (body.post_data) {
      // Se temos dados de post, verificamos de forma mais granular
      if (body.post_data.post_id || body.post_data.post_code) {
        // Usar o OR para verificar se existe pedido com o mesmo post ID ou post code
        whereClause.OR = [
          { 
            metadata: {
              path: ['post_id'],
              equals: body.post_data.post_id
            }
          },
          { 
            metadata: {
              path: ['post_code'],
              equals: body.post_data.post_code
            } 
          }
        ];
        
        // Incluir também verificação de URL quando disponível
        if (body.post_data.post_url) {
          whereClause.OR.push({
            target_url: body.post_data.post_url
          });
        }
        
        console.log(`[Orders Create] Verificando duplicidade para post específico: ${body.post_data.post_code || body.post_data.post_id}`);
      } else if (body.external_payment_id) {
        // Se não temos post ID/code, mas temos ID de pagamento externo específico para o post
        whereClause.metadata = {
          path: ['payment_id'],
          equals: body.external_payment_id
        };
        console.log(`[Orders Create] Verificando duplicidade por payment_id específico: ${body.external_payment_id}`);
      }
    }
    
    const existingOrders = await prisma.order.findMany({
      where: whereClause
    });
    
    if (existingOrders.length > 0) {
      console.log(`[Orders Create] Já existem ${existingOrders.length} pedidos para esta transação/post ${body.transaction_id}`);
      return NextResponse.json({
        message: 'Pedido já processado anteriormente',
        existingOrders: existingOrders.map(o => o.id),
        order_id: existingOrders[0].id,
        success: true
      });
    }
    
    // Verificar se o usuário já existe ou criar um novo
    let user = null;
    if (body.customer_email) {
      // Buscar usuário pelo email
      user = await prisma.user.findUnique({
        where: { email: body.customer_email }
      });
      
      if (!user) {
        // Criar novo usuário
        try {
          user = await prisma.user.create({
            data: {
              email: body.customer_email,
              name: body.customer_name || 'Cliente',
              phone: body.customer_phone || null,
              role: 'customer'
            }
          });
          console.log(`[Orders Create] Novo usuário criado com ID: ${user.id} e email: ${user.email}`);
        } catch (userError) {
          console.error('[Orders Create] Erro ao criar usuário:', userError);
        }
      } else {
        console.log(`[Orders Create] Usuário existente encontrado com ID: ${user.id} e email: ${user.email}`);
      }
    } else {
      console.log('[Orders Create] Dados de cliente não fornecidos, pedido será criado sem associação a usuário');
    }
    
    try {
      // Criar o pedido
      const order = await prisma.order.create({
        data: {
          transaction_id: body.transaction_id,
          service_id: body.service_id,
          external_service_id: body.external_service_id,
          provider_id: body.provider_id || null, // ID do provedor de serviços
          external_order_id: body.external_order_id || null, // ID do pedido no sistema do provedor
          status: 'pending',
          amount: body.amount || 0,
          quantity: body.quantity || 100,
          target_username: body.target_username,
          target_url: body.post_data?.post_url || body.target_url || `https://instagram.com/${body.target_username}`,
          customer_name: body.customer_name || null,
          customer_email: body.customer_email || null,
          user_id: user?.id || null,
          metadata: {
            payment_id: body.external_payment_id,
            service_type: body.payment_data?.service_type || 'instagram',
            external_service_id: body.external_service_id,
            payment_method: body.payment_data?.method,
            payment_status: body.payment_data?.status,
            // Incluir dados específicos do post, se existirem
            post_id: body.post_data?.post_id || null,
            post_code: body.post_data?.post_code || null,
            post_type: body.post_data?.post_type || null,
            is_reel: body.post_data?.is_reel || false,
            // Dados de provedor específicos
            provider_id: body.provider_id || null,
            provider_name: body.provider_name || null,
            external_order_data: body.external_order_data || null,
            // Incluir dados adicionais recebidos
            created_at: new Date().toISOString(),
            source: 'payment-processor'
          }
        }
      });
      
      console.log(`[Orders Create] Pedido criado com ID: ${order.id}`);
      
      // Registrar log
      await prisma.orderLog.create({
        data: {
          order_id: order.id,
          level: 'info',
          message: 'Pedido criado a partir do sistema de pagamentos',
          data: {
            transaction_id: body.transaction_id,
            source: 'payment-system'
          }
        }
      });
      
      // Retornar resposta de sucesso
      return NextResponse.json({
        success: true,
        message: 'Pedido criado com sucesso',
        order_id: order.id
      });
      
    } catch (orderError) {
      console.error('[Orders Create] Erro ao criar pedido:', orderError);
      
      return NextResponse.json(
        { error: 'Falha ao criar pedido', details: String(orderError), success: false },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Erro ao processar solicitação de criação de pedido:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar pedido',
        success: false
      }, 
      { status: 500 }
    );
  }
} 