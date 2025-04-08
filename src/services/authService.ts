
import { SignatureData, AuthSession } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

// Verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    // Validate input data
    if (!data.walletAddress || !data.signature || !data.nonce || !data.signedMessage) {
      throw new Error('Missing required authentication data');
    }

    console.log("Verifying signature with edge function...", {
      walletAddress: data.walletAddress,
      signatureLength: data.signature.length,
      nonceLength: data.nonce.length,
      hasSignedMessage: !!data.signedMessage
    });
    
    // Prepare request body with explicit typing
    const requestBody = {
      action: 'verifySignature',
      walletAddress: data.walletAddress,
      signature: data.signature,
      nonce: data.nonce,
      signedMessage: data.signedMessage,
      useSIWS: true
    };
    
    // Make the request with proper error handling
    const { data: responseData, error } = await supabase.functions.invoke('auth-phantom', {
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error("Error in verify signature response:", error);
      
      // Extract more specific error information if available
      const errorMessage = error.message || 'Edge function error';
      const errorDetail = error.context?.body ? `Details: ${error.context.body}` : 'No additional details';
      
      throw new Error(`${errorMessage}. ${errorDetail}`);
    }
    
    if (!responseData) {
      console.error("No data returned from verify signature endpoint");
      throw new Error('Verification failed - no data returned');
    }
    
    // Validate response data
    if (!responseData.userId || !responseData.token || !responseData.walletAddress) {
      console.error("Incomplete authentication data returned:", responseData);
      throw new Error('Incomplete authentication data returned');
    }
    
    console.log("Signature verification successful:", responseData);
    
    return {
      userId: responseData.userId,
      token: responseData.token,
      walletAddress: responseData.walletAddress
    };
  } catch (error: any) {
    console.error('Error verifying signature:', error);
    
    // Enhanced error reporting
    if (error.context?.status) {
      if (error.context.status === 401) {
        throw new Error('Invalid signature - authentication failed');
      } else if (error.context.status === 400) {
        throw new Error('Invalid request format - please check wallet connection');
      }
    }
    
    throw new Error(error.message || 'Failed to verify signature');
  }
}
