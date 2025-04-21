import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'viralizamos-orders-admin-secret-key';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  console.log('Requisição de login recebida');
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;
    console.log(`Tentativa de login para o email: ${email}`);

    if (!email || !password) {
      console.log('Email ou senha não fornecidos');
      return NextResponse.json(
        { message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se é um usuário admin
    // Em produção, deve-se usar hash+salt para senhas
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      console.log('Login com credenciais do ambiente');
      // Gerar token JWT
      const token = jwt.sign(
        {
          email,
          role: 'admin',
          exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
        },
        JWT_SECRET
      );

      // Definir cookie seguro
      const cookieStore = cookies();
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60, // 8 horas em segundos
        path: '/',
        sameSite: 'strict',
      });

      return NextResponse.json({ message: 'Login bem-sucedido' });
    }

    // Admin pré-definido para fins de desenvolvimento
    if (process.env.NODE_ENV === 'development' && email === 'admin@viralizamos.com' && password === 'admin123') {
      console.log('Login com credenciais de desenvolvimento');
      const token = jwt.sign(
        {
          email,
          role: 'admin',
          exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
        },
        JWT_SECRET
      );

      const cookieStore = cookies();
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 8 * 60 * 60, // 8 horas em segundos
        path: '/',
        sameSite: 'strict',
      });

      console.log('Cookie definido e retornando resposta de sucesso');
      return NextResponse.json({ message: 'Login bem-sucedido' });
    }

    console.log('Credenciais inválidas fornecidas');
    return NextResponse.json(
      { message: 'Credenciais inválidas' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Erro no login de admin:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 