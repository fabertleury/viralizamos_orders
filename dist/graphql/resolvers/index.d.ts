export declare const resolvers: {
    Query: {
        orders: (_: any, args: {
            limit: number;
            offset: number;
            status?: string;
            search?: string;
        }) => Promise<{
            orders: {
                id: string;
                transaction_id: string;
                service_id: string | null;
                provider_id: string | null;
                external_order_id: string | null;
                status: string;
                amount: number;
                quantity: number;
                target_username: string;
                target_url: string | null;
                customer_name: string | null;
                customer_email: string | null;
                provider_response: import("@prisma/client/runtime/library").JsonValue | null;
                created_at: Date;
                updated_at: Date;
                completed_at: Date | null;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                external_service_id: string | null;
                user_id: string | null;
            }[];
            count: number;
        }>;
        order: (_: any, args: {
            id: string;
        }) => Promise<{
            id: string;
            transaction_id: string;
            service_id: string | null;
            provider_id: string | null;
            external_order_id: string | null;
            status: string;
            amount: number;
            quantity: number;
            target_username: string;
            target_url: string | null;
            customer_name: string | null;
            customer_email: string | null;
            provider_response: import("@prisma/client/runtime/library").JsonValue | null;
            created_at: Date;
            updated_at: Date;
            completed_at: Date | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            external_service_id: string | null;
            user_id: string | null;
        }>;
        orderLogs: (_: any, args: {
            orderId: string;
        }) => Promise<{
            id: string;
            created_at: Date;
            order_id: string;
            level: string;
            message: string;
            data: import("@prisma/client/runtime/library").JsonValue | null;
        }[]>;
        services: (_: any, args: {
            providerId?: string;
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
        providers: () => Promise<{
            id: string;
            status: boolean;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            slug: string;
            api_key: string;
            api_url: string;
        }[]>;
        provider: (_: any, args: {
            id: string;
        }) => Promise<{
            id: string;
            status: boolean;
            created_at: Date;
            updated_at: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            name: string;
            description: string | null;
            slug: string;
            api_key: string;
            api_url: string;
        }>;
    };
    Mutation: {
        createOrder: (_: any, args: {
            transaction_id: string;
            service_id: string;
            target_username: string;
            quantity: number;
            attributes?: any;
        }) => Promise<{
            id: string;
            transaction_id: string;
            service_id: string | null;
            provider_id: string | null;
            external_order_id: string | null;
            status: string;
            amount: number;
            quantity: number;
            target_username: string;
            target_url: string | null;
            customer_name: string | null;
            customer_email: string | null;
            provider_response: import("@prisma/client/runtime/library").JsonValue | null;
            created_at: Date;
            updated_at: Date;
            completed_at: Date | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            external_service_id: string | null;
            user_id: string | null;
        }>;
        updateOrder: (_: any, args: {
            id: string;
            status?: string;
            notes?: string;
        }) => Promise<{
            id: string;
            transaction_id: string;
            service_id: string | null;
            provider_id: string | null;
            external_order_id: string | null;
            status: string;
            amount: number;
            quantity: number;
            target_username: string;
            target_url: string | null;
            customer_name: string | null;
            customer_email: string | null;
            provider_response: import("@prisma/client/runtime/library").JsonValue | null;
            created_at: Date;
            updated_at: Date;
            completed_at: Date | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            external_service_id: string | null;
            user_id: string | null;
        }>;
    };
};
