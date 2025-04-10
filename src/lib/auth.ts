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
export async function verify(request: NextRequest): Promise<VerifyResult> {
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
  } catch (error) {
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
export async function checkApiKey(request: NextRequest): Promise<boolean> {
  const result = await verify(request);
  return result.success;
} 