"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@prisma/client");
// Inicializar Prisma
const prisma = new client_1.PrismaClient();
// Lista de provedores a serem importados
const providersData = [
    {
        id: '153eb018-772e-47ff-890f-4f05b924e9ad',
        name: 'Servicos Redes Sociais',
        slug: 'servicos-redes-sociais',
        description: '',
        api_key: '109cbfef0a87d4952c8b07ff08424620',
        api_url: 'https://servicosredessociais.com.br/api/v2',
        status: true,
        metadata: {
            balance: 499.03373,
            currency: 'BRL',
            api_error: null,
            api_status: 'active',
            last_check: '2025-03-11T01:57:10.431Z'
        }
    },
    {
        id: '203a2011-b1eb-4be8-87dd-257db9377072',
        name: 'Seja Smm',
        slug: 'seja-smm',
        description: '',
        api_key: 'e3ff70984b6fddc3ed749a6225080e0b',
        api_url: 'https://sejasmm.com/api/v2',
        status: true,
        metadata: {
            balance: 0,
            currency: 'BRL',
            api_error: null,
            api_status: 'active',
            last_check: '2025-03-11T01:57:09.190Z'
        }
    },
    {
        id: '232399c2-d2c2-482a-9622-9376d4598b3f',
        name: 'Just Another Panel',
        slug: 'just-another-panel',
        description: '',
        api_key: '888ae74e711fad3f76d22df40db53a2c',
        api_url: 'https://justanotherpanel.com/api/v2',
        status: true,
        metadata: {
            balance: 52.5,
            currency: 'USD',
            api_error: null,
            api_status: 'active',
            last_check: '2025-03-11T01:57:07.002Z'
        }
    },
    {
        id: '7da7d672-c907-4474-a700-ca6df4c72842',
        name: 'Mea Smm',
        slug: 'mea-smm',
        description: '',
        api_key: '23ddeq349Prdxazd1223avvcz',
        api_url: 'https://measmm.com/api/v2',
        status: true,
        metadata: {
            balance: 0,
            currency: 'BRL',
            api_error: 'Failed to fetch',
            api_status: 'error',
            last_check: '2025-03-27T14:30:56.103Z'
        }
    },
    {
        id: 'dcd15b48-d42b-476d-b360-90f0b68cce2d',
        name: 'Fama nas redes',
        slug: 'fama-nas-redes',
        description: 'Fama nas Redes',
        api_key: '04be6a53e674e13f548cfd3932c5a3d2',
        api_url: 'https://famanasredes.com.br/api/v2',
        status: true,
        metadata: {
            balance: 10008.1098,
            currency: 'USD',
            api_error: null,
            api_status: 'active',
            last_check: '2025-03-22T05:17:25.606Z'
        }
    },
    {
        id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
        name: 'Gram Fama Oficial',
        slug: 'gram-fama-oficial',
        description: '',
        api_key: 'cb35b061913b505779c100c849d3fb73',
        api_url: 'https://gramfamaoficial.com.br/api/v2',
        status: true,
        metadata: {
            balance: 10,
            currency: 'BRL',
            api_error: null,
            api_status: 'active',
            last_check: '2025-03-11T01:57:05.606Z'
        }
    }
];
/**
 * Rota para importar provedores do sistema principal
 */
async function POST(request) {
    try {
        // Verificar autenticação via API key
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== process.env.API_SECRET_KEY) {
            return server_1.NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        // Importar provedores
        const results = [];
        for (const provider of providersData) {
            try {
                // Verificar se o provedor já existe
                const existingProvider = await prisma.provider.findUnique({
                    where: { id: provider.id }
                });
                if (existingProvider) {
                    // Atualizar provedor existente
                    const updated = await prisma.provider.update({
                        where: { id: provider.id },
                        data: {
                            name: provider.name,
                            slug: provider.slug,
                            description: provider.description,
                            api_key: provider.api_key,
                            api_url: provider.api_url,
                            status: provider.status,
                            metadata: provider.metadata,
                            updated_at: new Date()
                        }
                    });
                    results.push({
                        id: updated.id,
                        action: 'updated',
                        name: updated.name
                    });
                }
                else {
                    // Criar novo provedor
                    const created = await prisma.provider.create({
                        data: {
                            id: provider.id,
                            name: provider.name,
                            slug: provider.slug,
                            description: provider.description || '',
                            api_key: provider.api_key,
                            api_url: provider.api_url,
                            status: provider.status,
                            metadata: provider.metadata
                        }
                    });
                    results.push({
                        id: created.id,
                        action: 'created',
                        name: created.name
                    });
                }
            }
            catch (error) {
                console.error(`Erro ao processar provedor ${provider.name}:`, error);
                results.push({
                    name: provider.name,
                    action: 'error',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        }
        // Retornar resultados
        return server_1.NextResponse.json({
            success: true,
            imported: results.length,
            results
        });
    }
    catch (error) {
        console.error('Erro ao importar provedores:', error);
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro ao importar provedores'
        }, { status: 500 });
    }
}
