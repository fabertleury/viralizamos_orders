"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = verify;
exports.checkApiKey = checkApiKey;
/**
 * Verify if a request is authorized by checking the API key
 * @param request The incoming request
 * @returns Authentication result
 */
async function verify(request) {
    try {
        // Get the Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                success: false,
                message: 'Missing or invalid Authorization header'
            };
        }
        // Extract the API key
        const apiKey = authHeader.substring(7); // Remove 'Bearer '
        // Check the API key
        const validApiKey = process.env.API_KEY;
        // If no API key is configured, deny access
        if (!validApiKey) {
            console.warn('API_KEY not configured in .env');
            return {
                success: false,
                message: 'API key not configured on server'
            };
        }
        return {
            success: apiKey === validApiKey,
            message: apiKey === validApiKey ? 'Authorized' : 'Invalid API key'
        };
    }
    catch (error) {
        console.error('Error verifying API key:', error);
        return {
            success: false,
            message: 'Internal error during authentication'
        };
    }
}
/**
 * Simple check for API key authorization
 * @param request The incoming request
 * @returns Whether the request is authorized
 */
async function checkApiKey(request) {
    const result = await verify(request);
    return result.success;
}
