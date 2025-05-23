"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@prisma/client");
// Replace the import with inline authentication check
// import { verify } from '@/lib/auth';
const prisma = new client_1.PrismaClient();
// Simple auth function
async function verifyRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, message: 'Missing or invalid Authorization header' };
    }
    const apiKey = authHeader.substring(7);
    const validApiKey = process.env.API_KEY;
    if (!validApiKey) {
        console.warn('API_KEY not configured in .env');
        return { success: false, message: 'API key not configured on server' };
    }
    return {
        success: apiKey === validApiKey,
        message: apiKey === validApiKey ? 'Authorized' : 'Invalid API key'
    };
}
async function POST(request) {
    try {
        // Verificar autenticação
        const authResult = await verifyRequest(request);
        if (!authResult.success) {
            return server_1.NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        // Verificar permissões de admin
        if (authResult.role !== 'admin') {
            return server_1.NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
        }
        // Obter dados do provider
        const body = await request.json();
        const { name, slug, description, api_key, api_url, metadata } = body;
        // Validar dados obrigatórios
        if (!name || !slug || !api_key || !api_url) {
            return server_1.NextResponse.json({
                error: 'Dados incompletos. Forneça name, slug, api_key e api_url'
            }, { status: 400 });
        }
        // Verificar se o slug já existe
        const existingProvider = await prisma.provider.findUnique({
            where: { slug }
        });
        if (existingProvider) {
            return server_1.NextResponse.json({
                error: `Provedor com slug '${slug}' já existe`
            }, { status: 409 });
        }
        // Criar o provedor
        const provider = await prisma.provider.create({
            data: {
                name,
                slug,
                description,
                api_key,
                api_url,
                status: true,
                metadata: metadata || {}
            }
        });
        return server_1.NextResponse.json({
            success: true,
            provider: {
                id: provider.id,
                name: provider.name,
                slug: provider.slug,
                api_url: provider.api_url,
                created_at: provider.created_at
            }
        });
    }
    catch (error) {
        console.error('Erro ao criar provedor:', error);
        return server_1.NextResponse.json({
            error: 'Erro interno ao criar provedor'
        }, { status: 500 });
    }
}
