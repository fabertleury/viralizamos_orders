import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    count: number;
    providers: {
        id: string;
        name: string;
        slug: string;
        description: string;
        status: boolean;
        services: any;
        primary_service: any;
        service_types: any;
        recommended_for: any;
        balance: any;
        currency: any;
        api_status: any;
        priority: any;
    }[];
}>>;
