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

// Endpoint para métricas gerais dos usuários
export async function GET(request: NextRequest) {
  try {
    console.log('Endpoint panel-users/metrics acessado:', request.url);
    
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

    // Contar total de usuários
    const totalUsers = await prisma.user.count();
    
    // Contar usuários por tipo (role)
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    // Contar usuários ativos (com pelo menos um pedido)
    const activeUsers = await prisma.$queryRaw<{count: BigInt}[]>`
      SELECT COUNT(DISTINCT u.id) as count
      FROM "User" u
      INNER JOIN "Order" o ON u.id = o.user_id
    `;
    
    // Usuários mais recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await prisma.user.count({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Retornar as métricas agregadas
    const metrics = {
      totalUsers,
      usersByRole: usersByRole.map(role => ({
        role: role.role,
        count: role._count.id
      })),
      activeUsers: Number(activeUsers[0]?.count || 0),
      newUsers,
      inactiveUsers: totalUsers - Number(activeUsers[0]?.count || 0),
    };

    console.log('Retornando métricas de usuários:', metrics);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas de usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 