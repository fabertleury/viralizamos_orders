import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

// Validar API Key
const validateApiKey = (apiKey: string) => {
  return apiKey === API_KEY;
};

// Endpoint para listar provedores
// Específico para o painel administrativo
export async function GET(request: NextRequest) {
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

    // Buscar todos os provedores ativos
    const providers = await prisma.provider.findMany({
      where: {
        status: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      providers
    });
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar provedores', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
