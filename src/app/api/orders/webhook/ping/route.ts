import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Inicializar Prisma
const prisma = new PrismaClient();

/**
 * Endpoint para testar a autenticação entre serviços
 * Só responde com sucesso se o token JWT for válido
 */
export async function POST(request: NextRequest) {
  console.log('[Webhook Ping] Recebida requisição de teste de autenticação');
  
  try {
    // Verificar cabeçalho de autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Webhook Ping] Falha de autenticação: Token não fornecido');
      return NextResponse.json(
        { error: 'Credenciais de autenticação não fornecidas' }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    console.log('[Webhook Ping] Token recebido:', token.substring(0, 15) + '...');
    
    try {
      // Verificar token JWT
      const jwtSecret = process.env.JWT_SECRET || 'default_secret';
      const decoded = verify(token, jwtSecret);
      console.log('[Webhook Ping] Token verificado com sucesso, payload:', decoded);
    } catch (error) {
      console.error('[Webhook Ping] Falha na verificação do token JWT:', error);
      return NextResponse.json(
        { error: 'Token de autenticação inválido' }, 
        { status: 401 }
      );
    }
    
    // Se chegou até aqui, a autenticação está ok
    // Registrar o teste no log para fins de diagnóstico
    try {
      const body = await request.json();
      
      await prisma.webhookLog.create({
        data: {
          webhook_type: 'ping_test',
          source: 'payment-service',
          payload: body as any,
          processed: true,
          processed_at: new Date()
        }
      });
      
      console.log('[Webhook Ping] Teste de ping registrado no log');
    } catch (e) {
      console.error('[Webhook Ping] Erro ao registrar ping no log:', e);
      // Continuar mesmo se falhar para registrar no log
    }
    
    // Responder com sucesso
    return NextResponse.json({
      success: true,
      message: 'Autenticação bem-sucedida',
      service: 'orders',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Webhook Ping] Erro ao processar requisição de ping:', error);
    
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de ping' }, 
      { status: 500 }
    );
  }
} 