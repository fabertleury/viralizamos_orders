import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';

// Inicializar Prisma
const prisma = new PrismaClient();

interface WebhookPayload {
  type: string;
  transaction_id: string;
  payment_id: string;
  status: string;
  amount: number;
  metadata: {
    service: string;
    profile: string;
    posts: Array<{
      id: string;
      code: string;
      url?: string;
      caption?: string;
    }>;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    external_service_id: string;
  };
}

/**
 * Rota para receber webhooks de pagamento do microserviço de pagamentos
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar cabeçalho de autenticação
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
    
    // Obter e validar o payload
    const body = await request.json() as WebhookPayload;
    
    // Registrar webhook no log
    await prisma.webhookLog.create({
      data: {
        webhook_type: 'payment_notification',
        source: 'payment-service',
        payload: body as any,
        processed: false
      }
    });
    
    // Verificar tipo de webhook
    if (body.type !== 'payment_approved') {
      console.log(`Webhook ignorado: ${body.type}`);
      return NextResponse.json({ message: 'Webhook recebido, mas ignorado.' });
    }
    
    // Validar dados obrigatórios
    if (!body.transaction_id || !body.payment_id || !body.metadata?.service) {
      return NextResponse.json(
        { error: 'Dados incompletos no webhook' }, 
        { status: 400 }
      );
    }
    
    // Processar pedidos para cada post
    const orders = [];
    
    if (body.metadata.posts && body.metadata.posts.length > 0) {
      // Distribuir a quantidade igualmente entre os posts
      const postCount = body.metadata.posts.length;
      const serviceQuantity = 100; // Quantidade padrão, deve ser obtido do serviço
      const quantityPerPost = Math.floor(serviceQuantity / postCount);
      
      for (const post of body.metadata.posts) {
        // Criar pedido para cada post
        const order = await prisma.order.create({
          data: {
            transaction_id: body.transaction_id,
            service_id: body.metadata.service,
            external_service_id: body.metadata.external_service_id,
            status: 'pending',
            amount: body.amount / postCount, // Dividir o valor total pelo número de posts
            quantity: quantityPerPost,
            target_username: body.metadata.profile,
            target_url: post.url || `https://instagram.com/p/${post.code}`,
            customer_name: body.metadata.customer?.name || null,
            customer_email: body.metadata.customer?.email || null,
            metadata: {
              post_id: post.id,
              post_code: post.code,
              payment_id: body.payment_id,
              service_type: 'instagram',
              external_service_id: body.metadata.external_service_id
            }
          }
        });
        
        // Registrar log
        await prisma.orderLog.create({
          data: {
            order_id: order.id,
            level: 'info',
            message: 'Pedido criado a partir de pagamento aprovado',
            data: {
              payment_id: body.payment_id,
              transaction_id: body.transaction_id
            }
          }
        });
        
        orders.push(order);
      }
    } else {
      // Se não houver posts específicos, criar um pedido geral
      const order = await prisma.order.create({
        data: {
          transaction_id: body.transaction_id,
          service_id: body.metadata.service,
          external_service_id: body.metadata.external_service_id,
          status: 'pending',
          amount: body.amount,
          quantity: 100, // Quantidade padrão
          target_username: body.metadata.profile,
          customer_name: body.metadata.customer?.name || null,
          customer_email: body.metadata.customer?.email || null,
          metadata: {
            payment_id: body.payment_id,
            service_type: 'instagram',
            external_service_id: body.metadata.external_service_id
          }
        }
      });
      
      // Registrar log
      await prisma.orderLog.create({
        data: {
          order_id: order.id,
          level: 'info',
          message: 'Pedido geral criado a partir de pagamento aprovado',
          data: {
            payment_id: body.payment_id,
            transaction_id: body.transaction_id
          }
        }
      });
      
      orders.push(order);
    }
    
    // Marcar webhook como processado
    await prisma.webhookLog.updateMany({
      where: {
        webhook_type: 'payment_notification',
        source: 'payment-service',
        payload: {
          path: ['transaction_id'],
          equals: body.transaction_id
        },
        processed: false
      },
      data: {
        processed: true,
        processed_at: new Date()
      }
    });
    
    // Responder com sucesso
    return NextResponse.json({
      success: true,
      message: 'Pagamento processado com sucesso',
      orders_created: orders.length,
      order_ids: orders.map(order => order.id)
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook de pagamento:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook' 
      }, 
      { status: 500 }
    );
  }
} 