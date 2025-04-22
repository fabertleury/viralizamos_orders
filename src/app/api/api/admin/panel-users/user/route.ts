import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || process.env.ORDERS_API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

/// Validar API Key
const validateApiKey = (authHeader: string | null) => {
  if (!authHeader) return false;
  
  // Log para debug
  console.log('Auth header recebido:', authHeader);
  
  let apiKey: string | null = null;
  
  // Extrair o token dependendo do formato
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader.startsWith('ApiKey ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader.startsWith('Token ')) {
    apiKey = authHeader.substring(6);
  } else {
    // Considerar que pode ser apenas a chave direta
    apiKey = authHeader;
  }
  
  // Verificar chaves válidas
  const validApiKeys = [
    API_KEY,
    process.env.ORDERS_API_KEY,
    'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284',
    process.env.API_KEY
  ].filter(Boolean) as string[];
  
  console.log('API Key extraída:', apiKey);
  console.log('Chaves válidas a verificar:', validApiKeys.length);
  
  // Verificar se a chave extraída é válida
  return validApiKeys.includes(apiKey);
};

// Endpoint para listar todos os usuários sem paginação
// Versão simplificada para uso no frontend
export async function GET(request: NextRequest) {
  try {
    console.log('Endpoint panel-users/user acessado:', request.url);
    
    // Verificar autenticação via API key no header
    const authHeader = request.headers.get('Authorization');
    
    // Verificar autenticação
    if (!validateApiKey(authHeader)) {
      console.error('Erro de autenticação:', authHeader);
      return NextResponse.json(
        { error: 'Não autorizado', message: 'API key inválida ou não fornecida' },
        { status: 401 }
      );
    }

    // Buscar usuários básicos sem paginação
    const users = await prisma.user.findMany({
      orderBy: {
        name: 'asc', // Ordenar por nome para facilitar uso em selects
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });
    
    console.log(`Retornando lista de ${users.length} usuários`);

    return NextResponse.json({
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Erro ao buscar lista de usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 