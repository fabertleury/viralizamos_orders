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
  console.log('[Orders Webhook] Recebido webhook de pagamento');
  
  try {
    // Verificar cabeçalho de autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Orders Webhook] Falha de autenticação: Token não fornecido');
      return NextResponse.json(
        { error: 'Credenciais de autenticação não fornecidas' }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    console.log('[Orders Webhook] Token recebido:', token.substring(0, 15) + '...');
    
    try {
      // Verificar token JWT
      const jwtSecret = process.env.JWT_SECRET || 'default_secret';
      console.log('[Orders Webhook] Tentando verificar token com secret:', jwtSecret.substring(0, 10) + '...');
      
      const decoded = verify(token, jwtSecret);
      console.log('[Orders Webhook] Token verificado com sucesso, payload:', decoded);
    } catch (error) {
      console.error('[Orders Webhook] Falha na verificação do token JWT:', error);
      return NextResponse.json(
        { error: 'Token de autenticação inválido' }, 
        { status: 401 }
      );
    }
    
    // Obter e validar o payload
    const requestText = await request.text();
    console.log('[Orders Webhook] Payload recebido:', requestText);
    
    let body: WebhookPayload;
    try {
      body = JSON.parse(requestText) as WebhookPayload;
    } catch (e) {
      console.error('[Orders Webhook] Erro ao parsear JSON do payload:', e);
      return NextResponse.json(
        { error: 'Payload JSON inválido' }, 
        { status: 400 }
      );
    }
    
    // Registrar webhook no log
    console.log('[Orders Webhook] Registrando webhook no log');
    const webhookLog = await prisma.webhookLog.create({
      data: {
        webhook_type: 'payment_notification',
        source: 'payment-service',
        payload: body as any,
        processed: false
      }
    });
    console.log('[Orders Webhook] Webhook registrado com ID:', webhookLog.id);
    
    // Verificar tipo de webhook
    if (body.type !== 'payment_approved') {
      console.log(`[Orders Webhook] Webhook ignorado: ${body.type}`);
      return NextResponse.json({ message: 'Webhook recebido, mas ignorado.' });
    }
    
    // Validar dados obrigatórios
    if (!body.transaction_id || !body.payment_id || !body.metadata?.service) {
      console.error('[Orders Webhook] Dados incompletos no webhook:', { 
        transaction_id: body.transaction_id, 
        payment_id: body.payment_id, 
        service: body.metadata?.service 
      });
      return NextResponse.json(
        { error: 'Dados incompletos no webhook' }, 
        { status: 400 }
      );
    }
    
    console.log('[Orders Webhook] Dados validados, iniciando processamento');
    console.log('[Orders Webhook] Transaction ID:', body.transaction_id);
    console.log('[Orders Webhook] Payment ID:', body.payment_id);
    console.log('[Orders Webhook] Service ID:', body.metadata.service);
    console.log('[Orders Webhook] External Service ID:', body.metadata.external_service_id);
    console.log('[Orders Webhook] Profile:', body.metadata.profile);
    
    // Processar pedidos para cada post
    const orders = [];
    
    if (body.metadata.posts && body.metadata.posts.length > 0) {
      // Distribuir a quantidade igualmente entre os posts
      const postCount = body.metadata.posts.length;
      const serviceQuantity = body.metadata.total_quantity || 100; // Usar total_quantity ou valor padrão
      const quantityPerPost = Math.floor(serviceQuantity / postCount);
      
      console.log(`[Orders Webhook] Processando ${postCount} posts com ${quantityPerPost} cada`);
      
      for (const post of body.metadata.posts) {
        console.log(`[Orders Webhook] Criando pedido para post ID: ${post.id}, code: ${post.code}`);
        
        // Criar pedido para cada post
        try {
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
          
          console.log(`[Orders Webhook] Pedido criado com ID: ${order.id}`);
          
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
        } catch (orderError) {
          console.error(`[Orders Webhook] Erro ao criar pedido para post ${post.id}:`, orderError);
        }
      }
    } else {
      // Se não houver posts específicos, criar um pedido geral
      console.log('[Orders Webhook] Nenhum post específico encontrado, criando pedido geral');
      
      try {
        const order = await prisma.order.create({
          data: {
            transaction_id: body.transaction_id,
            service_id: body.metadata.service,
            external_service_id: body.metadata.external_service_id,
            status: 'pending',
            amount: body.amount,
            quantity: body.metadata.total_quantity || 100,
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
        
        console.log(`[Orders Webhook] Pedido geral criado com ID: ${order.id}`);
        
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
      } catch (orderError) {
        console.error('[Orders Webhook] Erro ao criar pedido geral:', orderError);
      }
    }
    
    // Marcar webhook como processado
    try {
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
      
      console.log('[Orders Webhook] Webhook marcado como processado');
    } catch (updateError) {
      console.error('[Orders Webhook] Erro ao atualizar status do webhook:', updateError);
    }
    
    // Responder com sucesso
    const response = {
      success: true,
      message: 'Pagamento processado com sucesso',
      orders_created: orders.length,
      order_ids: orders.map(order => order.id)
    };
    
    console.log('[Orders Webhook] Resposta:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Orders Webhook] Erro ao processar webhook de pagamento:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook' 
      }, 
      { status: 500 }
    );
  }
} 