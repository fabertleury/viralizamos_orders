import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Limpar o cookie de autenticação
    const cookieStore = cookies();
    cookieStore.delete('admin_token');
    
    return NextResponse.json({ message: 'Logout bem-sucedido' });
  } catch (error) {
    console.error('Erro ao processar logout:', error);
    return NextResponse.json(
      { message: 'Erro ao processar logout' },
      { status: 500 }
    );
  }
} 