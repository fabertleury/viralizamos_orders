import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const categoryResolvers = {
  Query: {
    categories: async () => {
      try {
        return await prisma.category.findMany({
          orderBy: { order_position: 'asc' },
        });
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        throw new Error('Falha ao buscar categorias');
      }
    },
    
    categoriesBySocial: async (_: any, { socialId }: { socialId: string }) => {
      try {
        return await prisma.category.findMany({
          where: { social_id: socialId },
          orderBy: { order_position: 'asc' },
        });
      } catch (error) {
        console.error(`Erro ao buscar categorias da rede social ${socialId}:`, error);
        throw new Error('Falha ao buscar categorias');
      }
    },
    
    category: async (_: any, { id }: { id: string }) => {
      try {
        return await prisma.category.findUnique({
          where: { id },
        });
      } catch (error) {
        console.error(`Erro ao buscar categoria com id ${id}:`, error);
        throw new Error('Falha ao buscar categoria');
      }
    },
    
    categoryBySlug: async (_: any, { slug }: { slug: string }) => {
      try {
        return await prisma.category.findUnique({
          where: { slug },
        });
      } catch (error) {
        console.error(`Erro ao buscar categoria com slug ${slug}:`, error);
        throw new Error('Falha ao buscar categoria');
      }
    },
  },
  
  Mutation: {
    createCategory: async (_: any, data: any) => {
      try {
        // Verificar se a rede social existe
        const social = await prisma.social.findUnique({
          where: { id: data.social_id },
        });
        
        if (!social) {
          throw new Error('Rede social não encontrada');
        }
        
        return await prisma.category.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            icon: data.icon,
            active: data.active !== undefined ? data.active : true,
            order_position: data.order_position || 0,
            social_id: data.social_id,
            metadata: data.metadata || {},
          },
        });
      } catch (error) {
        console.error('Erro ao criar categoria:', error);
        throw new Error('Falha ao criar categoria');
      }
    },
    
    updateCategory: async (_: any, { id, ...data }: any) => {
      try {
        // Verificar se a categoria existe
        const existingCategory = await prisma.category.findUnique({
          where: { id },
        });
        
        if (!existingCategory) {
          throw new Error('Categoria não encontrada');
        }
        
        // Se o slug foi alterado, verificar se já existe outra categoria com este slug
        if (data.slug && data.slug !== existingCategory.slug) {
          const categoryWithSameSlug = await prisma.category.findUnique({
            where: { slug: data.slug },
          });
          
          if (categoryWithSameSlug) {
            throw new Error('Já existe uma categoria com este slug');
          }
        }
        
        // Se a rede social foi alterada, verificar se existe
        if (data.social_id && data.social_id !== existingCategory.social_id) {
          const social = await prisma.social.findUnique({
            where: { id: data.social_id },
          });
          
          if (!social) {
            throw new Error('Rede social não encontrada');
          }
        }
        
        return await prisma.category.update({
          where: { id },
          data,
        });
      } catch (error) {
        console.error(`Erro ao atualizar categoria com id ${id}:`, error);
        throw error; // Repassar o erro para mostrar mensagem específica
      }
    },
    
    deleteCategory: async (_: any, { id }: { id: string }) => {
      try {
        // Verificar se existem subcategorias associadas
        const subcategoriesCount = await prisma.subcategory.count({
          where: { category_id: id },
        });
        
        if (subcategoriesCount > 0) {
          throw new Error(
            'Não é possível excluir esta categoria pois existem subcategorias associadas a ela'
          );
        }
        
        // Verificar se existem serviços associados
        const servicesCount = await prisma.service.count({
          where: { category_id: id },
        });
        
        if (servicesCount > 0) {
          throw new Error(
            'Não é possível excluir esta categoria pois existem serviços associados a ela'
          );
        }
        
        await prisma.category.delete({
          where: { id },
        });
        
        return true;
      } catch (error) {
        console.error(`Erro ao excluir categoria com id ${id}:`, error);
        throw error; // Repassar o erro para mostrar mensagem específica
      }
    },
  },
  
  Category: {
    social: async (parent: { social_id: string }) => {
      try {
        return await prisma.social.findUnique({
          where: { id: parent.social_id },
        });
      } catch (error) {
        console.error(`Erro ao buscar rede social da categoria ${parent.social_id}:`, error);
        return null;
      }
    },
    
    subcategories: async (parent: { id: string }) => {
      try {
        return await prisma.subcategory.findMany({
          where: { category_id: parent.id },
          orderBy: { order_position: 'asc' },
        });
      } catch (error) {
        console.error(`Erro ao buscar subcategorias da categoria ${parent.id}:`, error);
        return [];
      }
    },
    
    services: async (parent: { id: string }) => {
      try {
        return await prisma.service.findMany({
          where: { category_id: parent.id },
        });
      } catch (error) {
        console.error(`Erro ao buscar serviços da categoria ${parent.id}:`, error);
        return [];
      }
    },
  },
}; 