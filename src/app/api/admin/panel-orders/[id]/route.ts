import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

// Validar API Key
const validateApiKey = (apiKey: string) => {
  return apiKey === API_KEY;
};

// Endpoint para obter detalhes de um pedido específico
// Específico para o painel administrativo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação via API key no header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key não fornecida' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key inválida' },
        { status: 401 }
      );
    }

    const id = params.id;
    
    // Buscar o pedido pelo ID
    const order = await prisma.order.findUnique({
      where: {
        id: id
      },
      include: {
        provider: true,
        user: true,
        logs: {
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes do pedido', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
