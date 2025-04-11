export declare const subcategoryResolvers: {
    Query: {
        subcategories: () => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }[]>;
        subcategoriesByCategory: (_: any, { categoryId }: {
            categoryId: string;
        }) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }[]>;
        subcategory: (_: any, { id }: {
            id: string;
        }) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }>;
        subcategoryBySlug: (_: any, { slug }: {
            slug: string;
        }) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }>;
    };
    Mutation: {
        createSubcategory: (_: any, data: any) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }>;
        updateSubcategory: (_: any, { id, ...data }: any) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            category_id: string;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
        }>;
        deleteSubcategory: (_: any, { id }: {
            id: string;
        }) => Promise<boolean>;
    };
    Subcategory: {
        category: (parent: {
            category_id: string;
        }) => Promise<{
            id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            slug: string;
            active: boolean;
            icon: string | null;
            order_position: number;
            social_id: string;
        }>;
        services: (parent: {
            id: string;
        }) => Promise<{
            id: string;
            provider_id: string;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            external_id: string;
            description: string | null;
            type: string;
            platform: string;
            price: number;
            min_quantity: number;
            max_quantity: number;
            default_quantity: number | null;
            is_active: boolean;
            category_id: string | null;
            subcategory_id: string | null;
        }[]>;
    };
};
