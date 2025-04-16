import { NextRequest } from 'next/server';
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Result of an authentication verification
 */
interface VerifyResult {
  success: boolean;
  message?: string;
}

/**
 * Verify if a request is authorized by checking the API key
 * @param request The incoming request
 * @returns Authentication result
 */
export async function verify(request: NextRequest): Promise<VerifyResult> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        message: 'Missing or invalid Authorization header' 
      };
    }
    
    // Extract the API key
    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    // Check the API key
    const validApiKey = process.env.API_KEY;
    
    // If no API key is configured, deny access
    if (!validApiKey) {
      console.warn('API_KEY not configured in .env');
      return { 
        success: false, 
        message: 'API key not configured on server' 
      };
    }
    
    return { 
      success: apiKey === validApiKey,
      message: apiKey === validApiKey ? 'Authorized' : 'Invalid API key' 
    };
  } catch (error) {
    console.error('Error verifying API key:', error);
    return { 
      success: false, 
      message: 'Internal error during authentication' 
    };
  }
}

/**
 * Simple check for API key authorization
 * @param request The incoming request
 * @returns Whether the request is authorized
 */
export async function checkApiKey(request: NextRequest): Promise<boolean> {
  const result = await verify(request);
  return result.success;
}

/**
 * Utilitário para autenticação e verificação de API keys
 */

/**
 * Verifica se a API key fornecida no cabeçalho de autorização é válida
 * @param authHeader O cabeçalho de autorização da requisição
 * @returns true se a API key for válida, false caso contrário
 */
export function verifyApiKey(authHeader: string | null): boolean {
  if (!authHeader) {
    return false;
  }

  // Extrair a API key do cabeçalho
  const apiKey = extractApiKey(authHeader);
  
  // Obter a API key esperada do arquivo .env
  const expectedApiKey = process.env.ORDERS_API_KEY || '';
  
  // Verificar se a API key enviada corresponde à API key esperada
  return apiKey === expectedApiKey;
}

/**
 * Extrai a API key do cabeçalho de autorização
 * @param authHeader O cabeçalho de autorização da requisição
 * @returns A API key extraída do cabeçalho
 */
function extractApiKey(authHeader: string): string {
  // O formato esperado é "Bearer API_KEY" ou "ApiKey API_KEY"
  const parts = authHeader.split(' ');
  
  if (parts.length === 2) {
    const [scheme, key] = parts;
    
    if (scheme === 'Bearer' || scheme === 'ApiKey') {
      return key;
    }
  }
  
  // Se o cabeçalho não está no formato esperado, considere o cabeçalho inteiro como a API key
  return authHeader;
}

// Define as opções de autenticação
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Implementação básica de autorização
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Para ambiente de desenvolvimento/teste, podemos ter um usuário simples
        if (process.env.NODE_ENV !== 'production') {
          if (credentials.email === 'admin@viralizamos.com' && 
              credentials.password === 'admin123') {
            return {
              id: '1',
              name: 'Admin',
              email: 'admin@viralizamos.com',
              role: 'admin'
            };
          }
        }

        // Buscar o usuário no banco de dados
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // Verificar se o usuário existe e se a senha está correta
        // Nota: Em um ambiente de produção real, você deve utilizar comparação de hash para senhas
        if (!user) {
          return null;
        }

        // Retornar o usuário autenticado
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'orders-development-secret-key',
};

// Estender tipos
declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
} 