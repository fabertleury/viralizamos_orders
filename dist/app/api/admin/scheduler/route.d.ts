import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    pendingOrdersQueue: import("bull").JobCounts;
    statusCheckQueue: import("bull").JobCounts;
}> | NextResponse<{
    message: string;
}>>;
