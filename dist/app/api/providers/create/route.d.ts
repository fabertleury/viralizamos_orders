import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    provider: {
        id: string;
        name: string;
        slug: string;
        api_url: string;
        created_at: Date;
    };
}>>;
