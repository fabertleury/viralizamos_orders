"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
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
async function GET(request) {
    try {
        // Verificar autenticação
        const authResult = await verifyRequest(request);
        if (!authResult.success) {
            return server_1.NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        // Obter parâmetros da query
        const { searchParams } = new URL(request.url);
        const service = searchParams.get('service');
        const serviceType = searchParams.get('service_type');
        // Construir a consulta
        let whereClause = {
            status: true // Apenas provedores ativos
        };
        // Filtrar por serviço
        if (service) {
            whereClause.OR = [
                {
                    metadata: {
                        path: ['services'],
                        array_contains: service
                    }
                },
                {
                    metadata: {
                        path: ['primary_service'],
                        equals: service
                    }
                }
            ];
        }
        // Buscar provedores
        const providers = await prisma.provider.findMany({
            where: whereClause,
            orderBy: [
                {
                    metadata: {
                        path: ['priority'],
                        sort: 'asc'
                    }
                },
                { name: 'asc' }
            ]
        });
        // Filtrar por tipo de serviço se necessário (já que não podemos fazer isso diretamente na consulta)
        let filteredProviders = providers;
        if (serviceType) {
            filteredProviders = providers.filter(provider => {
                const metadata = provider.metadata;
                return metadata.service_types && metadata.service_types.includes(serviceType);
            });
        }
        // Formatar a resposta
        const formattedProviders = filteredProviders.map(provider => {
            const metadata = provider.metadata;
            return {
                id: provider.id,
                name: provider.name,
                slug: provider.slug,
                description: provider.description,
                status: provider.status,
                services: metadata.services || [],
                primary_service: metadata.primary_service || null,
                service_types: metadata.service_types || [],
                recommended_for: metadata.recommended_for || [],
                balance: metadata.balance,
                currency: metadata.currency,
                api_status: metadata.api_status,
                priority: metadata.priority
            };
        });
        return server_1.NextResponse.json({
            success: true,
            count: formattedProviders.length,
            providers: formattedProviders
        });
    }
    catch (error) {
        console.error('Erro ao listar provedores:', error);
        return server_1.NextResponse.json({
            error: 'Erro interno ao listar provedores'
        }, { status: 500 });
    }
}
