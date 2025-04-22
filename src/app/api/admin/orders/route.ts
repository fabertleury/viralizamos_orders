import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'viralizamos-orders-admin-secret-key';

// Validar token JWT e verificar se é admin
const validateAdminToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === 'admin';
  } catch (error) {
    return false;
  }
};

// Endpoint para listar pedidos com paginação, filtros e busca
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token')?.value;
    
    if (!token || !validateAdminToken(token)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Parâmetros de paginação e filtros
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    // Calcular offset para paginação
    const skip = (page - 1) * limit;

    // Preparar filtros
    let whereClause: any = {};
    
    // Filtrar por status, se especificado
    if (status) {
      whereClause.status = status;
    }
    
    // Filtrar por termo de busca
    if (search) {
      whereClause.OR = [
        { transaction_id: { contains: search, mode: 'insensitive' } },
        { customer_email: { contains: search, mode: 'insensitive' } },
        { target_username: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Buscar pedidos com base nos filtros e paginação
    const orders = await prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        transaction_id: true,
        customer_email: true,
        status: true,
        amount: true,
        created_at: true,
        provider: true,
        target_username: true,
        service_id: true,
      },
    });

    // Contar total de pedidos para paginação
    const totalOrders = await prisma.order.count({
      where: whereClause,
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(totalOrders / limit);

    // Buscar contagens por status para os filtros
    const statusCounts = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE TRUE) as all_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed' OR status = 'error') as failed_count
      FROM "Order"
      ${search ? 
        prisma.$queryRaw`WHERE 
          transaction_id ILIKE ${`%${search}%`} OR 
          customer_email ILIKE ${`%${search}%`} OR 
          target_username ILIKE ${`%${search}%`}` :
        prisma.$queryRaw``
      }
    `;

    const counts = statusCounts[0];

    return NextResponse.json({
      orders,
        page,
      totalPages,
      totalItems: totalOrders,
      statusCounts: {
        all: parseInt(counts.all_count.toString()),
        pending: parseInt(counts.pending_count.toString()),
        processing: parseInt(counts.processing_count.toString()),
        completed: parseInt(counts.completed_count.toString()),
        failed: parseInt(counts.failed_count.toString()),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
} 