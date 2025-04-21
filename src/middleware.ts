import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

// Chave secreta JWT
const JWT_SECRET = process.env.JWT_SECRET || 'viralizamos-orders-admin-secret-key';

export async function middleware(request: NextRequest) {
  // Verificar se é rota de painel administrativo
  if (request.nextUrl.pathname.startsWith('/painel') && 
      !request.nextUrl.pathname.startsWith('/painel/login')) {
    
    // Obter token do cookie
    const token = request.cookies.get('admin_token')?.value;
    
    // Verificar se o token está presente
    if (!token) {
      return NextResponse.redirect(new URL('/painel/login', request.url));
    }
    
    // Validar o token JWT
    try {
      verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      console.error('Token JWT inválido:', error);
      return NextResponse.redirect(new URL('/painel/login', request.url));
    }
  }
  
  // Caso não seja uma rota protegida, continuar normalmente
  return NextResponse.next();
}

// Configurar padrões de rotas para aplicar o middleware
export const config = {
  matcher: '/painel/:path*',
}; 