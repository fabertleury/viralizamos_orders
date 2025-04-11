export declare const socialResolvers: {
    Query: {
        socialNetworks: () => Promise<{
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
        }[]>;
        socialNetwork: (_: any, { id }: {
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
            icon_url: string | null;
        }>;
        socialNetworkBySlug: (_: any, { slug }: {
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
            icon_url: string | null;
        }>;
    };
    Mutation: {
        createSocial: (_: any, data: any) => Promise<{
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
        updateSocial: (_: any, { id, ...data }: any) => Promise<{
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
        deleteSocial: (_: any, { id }: {
            id: string;
        }) => Promise<boolean>;
    };
    Social: {
        categories: (parent: {
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
        }[]>;
    };
};
