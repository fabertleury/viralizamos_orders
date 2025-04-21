import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Simulação de armazenamento de configurações
// Em produção, isso seria armazenado no banco de dados
let systemSettings = {
  webhookEnabled: true,
  notificationsEnabled: true,
  autoRetryEnabled: true,
  maxRetryAttempts: 3,
  serviceApiUrl: 'https://api.viralizamos.com/v1',
  logLevel: 'info',
  maintenanceMode: false,
};

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key';
const prisma = new PrismaClient();

// Função auxiliar para verificar token JWT
const verifyAdminToken = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === 'admin';
  } catch (error) {
    return false;
  }
};

// Função para verificar se o usuário é admin
const isAdmin = (request: NextRequest): boolean => {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    return false;
  }

  return verifyAdminToken(token);
};

export async function GET(request: NextRequest) {
  try {
    // Verificar se o usuário é admin
    if (!isAdmin(request)) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Retorna as configurações
    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se o usuário é admin
    if (!isAdmin(request)) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter as configurações do corpo da requisição
    const requestBody = await request.json();
    
    // Validar campos obrigatórios
    if (
      typeof requestBody.webhookEnabled !== 'boolean' ||
      typeof requestBody.notificationsEnabled !== 'boolean' ||
      typeof requestBody.autoRetryEnabled !== 'boolean' ||
      (typeof requestBody.maxRetryAttempts !== 'number' || 
       requestBody.maxRetryAttempts < 1 || 
       requestBody.maxRetryAttempts > 10) ||
      typeof requestBody.serviceApiUrl !== 'string' ||
      !['debug', 'info', 'warn', 'error'].includes(requestBody.logLevel) ||
      typeof requestBody.maintenanceMode !== 'boolean'
    ) {
      return NextResponse.json(
        { message: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Atualizar configurações
    systemSettings = {
      ...systemSettings,
      ...requestBody,
    };

    // Em produção, você salvaria essas configurações no banco de dados
    // Exemplo: await prisma.systemSettings.upsert({ ... })

    // Registrar ação
    console.log('Configurações atualizadas por admin');

    return NextResponse.json(
      { message: 'Configurações atualizadas com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { message: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
} 