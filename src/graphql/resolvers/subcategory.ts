import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const subcategoryResolvers = {
  Query: {
    subcategories: async () => {
      try {
        return await prisma.subcategory.findMany({
          orderBy: { order_position: 'asc' },
        });
      } catch (error) {
        console.error('Erro ao buscar subcategorias:', error);
        throw new Error('Falha ao buscar subcategorias');
      }
    },
    
    subcategoriesByCategory: async (_: any, { categoryId }: { categoryId: string }) => {
      try {
        return await prisma.subcategory.findMany({
          where: { category_id: categoryId },
          orderBy: { order_position: 'asc' },
        });
      } catch (error) {
        console.error(`Erro ao buscar subcategorias da categoria ${categoryId}:`, error);
        throw new Error('Falha ao buscar subcategorias');
      }
    },
    
    subcategory: async (_: any, { id }: { id: string }) => {
      try {
        return await prisma.subcategory.findUnique({
          where: { id },
        });
      } catch (error) {
        console.error(`Erro ao buscar subcategoria com id ${id}:`, error);
        throw new Error('Falha ao buscar subcategoria');
      }
    },
    
    subcategoryBySlug: async (_: any, { slug }: { slug: string }) => {
      try {
        return await prisma.subcategory.findUnique({
          where: { slug },
        });
      } catch (error) {
        console.error(`Erro ao buscar subcategoria com slug ${slug}:`, error);
        throw new Error('Falha ao buscar subcategoria');
      }
    },
  },
  
  Mutation: {
    createSubcategory: async (_: any, data: any) => {
      try {
        // Verificar se a categoria existe
        const category = await prisma.category.findUnique({
          where: { id: data.category_id },
        });
        
        if (!category) {
          throw new Error('Categoria não encontrada');
        }
        
        return await prisma.subcategory.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            icon: data.icon,
            active: data.active !== undefined ? data.active : true,
            order_position: data.order_position || 0,
            category_id: data.category_id,
            metadata: data.metadata || {},
          },
        });
      } catch (error) {
        console.error('Erro ao criar subcategoria:', error);
        throw new Error('Falha ao criar subcategoria');
      }
    },
    
    updateSubcategory: async (_: any, { id, ...data }: any) => {
      try {
        // Verificar se existe
        const existingSubcategory = await prisma.subcategory.findUnique({
          where: { id },
        });
        
        if (!existingSubcategory) {
          throw new Error('Subcategoria não encontrada');
        }
        
        // Se o slug foi alterado, verificar se já existe outra subcategoria com este slug
        if (data.slug && data.slug !== existingSubcategory.slug) {
          const subcategoryWithSameSlug = await prisma.subcategory.findUnique({
            where: { slug: data.slug },
          });
          
          if (subcategoryWithSameSlug) {
            throw new Error('Já existe uma subcategoria com este slug');
          }
        }
        
        // Se a categoria foi alterada, verificar se existe
        if (data.category_id && data.category_id !== existingSubcategory.category_id) {
          const category = await prisma.category.findUnique({
            where: { id: data.category_id },
          });
          
          if (!category) {
            throw new Error('Categoria não encontrada');
          }
        }
        
        return await prisma.subcategory.update({
          where: { id },
          data,
        });
      } catch (error) {
        console.error(`Erro ao atualizar subcategoria com id ${id}:`, error);
        throw error; // Repassar o erro para mostrar mensagem específica
      }
    },
    
    deleteSubcategory: async (_: any, { id }: { id: string }) => {
      try {
        // Verificar se existem serviços associados
        const servicesCount = await prisma.service.count({
          where: { subcategory_id: id },
        });
        
        if (servicesCount > 0) {
          throw new Error(
            'Não é possível excluir esta subcategoria pois existem serviços associados a ela'
          );
        }
        
        await prisma.subcategory.delete({
          where: { id },
        });
        
        return true;
      } catch (error) {
        console.error(`Erro ao excluir subcategoria com id ${id}:`, error);
        throw error; // Repassar o erro para mostrar mensagem específica
      }
    },
  },
  
  Subcategory: {
    category: async (parent: { category_id: string }) => {
      try {
        return await prisma.category.findUnique({
          where: { id: parent.category_id },
        });
      } catch (error) {
        console.error(`Erro ao buscar categoria da subcategoria ${parent.category_id}:`, error);
        return null;
      }
    },
    
    services: async (parent: { id: string }) => {
      try {
        return await prisma.service.findMany({
          where: { subcategory_id: parent.id },
        });
      } catch (error) {
        console.error(`Erro ao buscar serviços da subcategoria ${parent.id}:`, error);
        return [];
      }
    },
  },
}; 