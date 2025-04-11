import { NextRequest } from 'next/server';
/**
 * Result of an authentication verification
 */
interface VerifyResult {
    success: boolean;
    message?: string;
}
/**
 * Verify if a request is authorized by checking the API key
 * @param request The incoming request
 * @returns Authentication result
 */
export declare function verify(request: NextRequest): Promise<VerifyResult>;
/**
 * Simple check for API key authorization
 * @param request The incoming request
 * @returns Whether the request is authorized
 */
export declare function checkApiKey(request: NextRequest): Promise<boolean>;
export {};
