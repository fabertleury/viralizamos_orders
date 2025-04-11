export declare const categoryResolvers: {
    Query: {
        categories: () => Promise<{
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
        }[]>;
        categoriesBySocial: (_: any, { socialId }: {
            socialId: string;
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
        }[]>;
        category: (_: any, { id }: {
            id: string;
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
        categoryBySlug: (_: any, { slug }: {
            slug: string;
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
    };
    Mutation: {
        createCategory: (_: any, data: any) => Promise<{
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
        updateCategory: (_: any, { id, ...data }: any) => Promise<{
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
        deleteCategory: (_: any, { id }: {
            id: string;
        }) => Promise<boolean>;
    };
    Category: {
        social: (parent: {
            social_id: string;
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
            icon_url: string | null;
        }>;
        subcategories: (parent: {
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
        }[]>;
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
