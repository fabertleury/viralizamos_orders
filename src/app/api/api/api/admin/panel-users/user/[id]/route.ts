import { NextRequest, NextResponse } from 'next/server';

// Rota de redirecionamento para compatibilidade com a URL duplicada (/api/api/...)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;
  console.log(`Rota de compatibilidade /api/api/admin/panel-users/user/${userId} acessada`);
  
  // Construir a nova URL
  const newUrl = new URL(`/api/admin/panel-users/user/${userId}`, request.nextUrl.origin);
  
  // Copiar todos os parâmetros da query para a nova URL
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    newUrl.searchParams.append(key, value);
  });
  
  // Copiar todos os headers
  const headers = new Headers(request.headers);
  
  console.log('Redirecionando para:', newUrl.toString());
  
  // Redirecionar para a rota correta
  return NextResponse.redirect(newUrl, {
    status: 307, // Temporary redirect
    headers: headers
  });
} 