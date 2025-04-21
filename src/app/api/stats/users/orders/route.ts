import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/auth';

/**
 * Endpoint para obter estatísticas de pedidos por email de usuário
 * Este endpoint recebe uma lista de emails e retorna estatísticas
 * de pedidos para cada um.
 * 
 * @route POST /api/stats/users/orders
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem a API key correta
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKey(authHeader)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obter a lista de emails do corpo da requisição
    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'É necessário fornecer uma lista de emails' },
        { status: 400 }
      );
    }

    console.log(`[API:Stats:Users] Buscando estatísticas de pedidos para ${emails.length} emails`);

    // Limitar o número de emails para evitar queries muito pesadas
    const emailsLimit = emails.slice(0, 100);
    
    // Resultado que será retornado - mapeamento por email
    const resultado: Record<string, any> = {};
    
    // Para cada email, buscar as estatísticas
    for (const email of emailsLimit) {
      // Buscar os pedidos mais recentes deste usuário
      const pedidos = await prisma.order.findMany({
        where: {
          customer_email: email
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 50 // Limitar a quantidade para performance
      });
      
      // Calcular estatísticas
      const totalPedidos = pedidos.length;
      
      // Calcular valor total gasto (soma dos valores de todos os pedidos)
      const totalGasto = pedidos.reduce((soma, pedido) => soma + (pedido.amount || 0), 0);
      
      // Obter dados do último pedido, se existir
      const ultimoPedido = pedidos[0] ? {
        data: pedidos[0].created_at.toISOString(),
        valor: pedidos[0].amount || 0,
        status: pedidos[0].status,
        produto: pedidos[0].external_service_id || 'Não identificado'
      } : null;
      
      // Coletar todos os serviços únicos utilizados
      const servicosUtilizados = [...new Set(
        pedidos
          .map(pedido => pedido.external_service_id)
          .filter(Boolean) as string[]
      )];
      
      // Adicionar as estatísticas ao resultado
      resultado[email] = {
        total_pedidos: totalPedidos,
        total_gasto: totalGasto,
        ultimo_pedido: ultimoPedido,
        servicos: servicosUtilizados
      };
    }
    
    console.log(`[API:Stats:Users] Retornando estatísticas para ${Object.keys(resultado).length} emails`);
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de pedidos por email:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 