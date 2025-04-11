"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialResolvers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.socialResolvers = {
    Query: {
        socialNetworks: async () => {
            try {
                return await prisma.social.findMany({
                    orderBy: { order_position: 'asc' },
                });
            }
            catch (error) {
                console.error('Erro ao buscar redes sociais:', error);
                throw new Error('Falha ao buscar redes sociais');
            }
        },
        socialNetwork: async (_, { id }) => {
            try {
                return await prisma.social.findUnique({
                    where: { id },
                });
            }
            catch (error) {
                console.error(`Erro ao buscar rede social com id ${id}:`, error);
                throw new Error('Falha ao buscar rede social');
            }
        },
        socialNetworkBySlug: async (_, { slug }) => {
            try {
                return await prisma.social.findUnique({
                    where: { slug },
                });
            }
            catch (error) {
                console.error(`Erro ao buscar rede social com slug ${slug}:`, error);
                throw new Error('Falha ao buscar rede social');
            }
        },
    },
    Mutation: {
        createSocial: async (_, data) => {
            try {
                return await prisma.social.create({
                    data: {
                        name: data.name,
                        slug: data.slug,
                        icon: data.icon,
                        icon_url: data.icon_url,
                        description: data.description,
                        active: data.active !== undefined ? data.active : true,
                        order_position: data.order_position || 0,
                        metadata: data.metadata || {},
                    },
                });
            }
            catch (error) {
                console.error('Erro ao criar rede social:', error);
                throw new Error('Falha ao criar rede social');
            }
        },
        updateSocial: async (_, { id, ...data }) => {
            try {
                // Verificar se existe
                const existingSocial = await prisma.social.findUnique({
                    where: { id },
                });
                if (!existingSocial) {
                    throw new Error('Rede social não encontrada');
                }
                // Se o slug foi alterado, verificar se já existe outro com este slug
                if (data.slug && data.slug !== existingSocial.slug) {
                    const socialWithSameSlug = await prisma.social.findUnique({
                        where: { slug: data.slug },
                    });
                    if (socialWithSameSlug) {
                        throw new Error('Já existe uma rede social com este slug');
                    }
                }
                return await prisma.social.update({
                    where: { id },
                    data,
                });
            }
            catch (error) {
                console.error(`Erro ao atualizar rede social com id ${id}:`, error);
                throw error; // Repassar o erro para mostrar mensagem específica
            }
        },
        deleteSocial: async (_, { id }) => {
            try {
                // Verificar se existem categorias associadas
                const categoriesCount = await prisma.category.count({
                    where: { social_id: id },
                });
                if (categoriesCount > 0) {
                    throw new Error('Não é possível excluir esta rede social pois existem categorias associadas a ela');
                }
                await prisma.social.delete({
                    where: { id },
                });
                return true;
            }
            catch (error) {
                console.error(`Erro ao excluir rede social com id ${id}:`, error);
                throw error; // Repassar o erro para mostrar mensagem específica
            }
        },
    },
    Social: {
        categories: async (parent) => {
            try {
                return await prisma.category.findMany({
                    where: { social_id: parent.id },
                    orderBy: { order_position: 'asc' },
                });
            }
            catch (error) {
                console.error(`Erro ao buscar categorias da rede social ${parent.id}:`, error);
                return [];
            }
        },
    },
};
