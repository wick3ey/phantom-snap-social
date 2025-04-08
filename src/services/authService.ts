
import { SignatureData, AuthSession } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

// Verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    // Validate input data
    if (!data.walletAddress || !data.signature || !data.nonce || !data.signedMessage) {
      console.error("Missing required authentication data:", {
        hasWalletAddress: !!data.walletAddress,
        hasSignature: !!data.signature,
        hasNonce: !!data.nonce,
        hasSignedMessage: !!data.signedMessage
      });
      throw new Error('Missing required authentication data');
    }
    
    // Validate wallet address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.walletAddress)) {
      console.error("Invalid wallet address format:", data.walletAddress);
      throw new Error('Invalid wallet address format');
    }
    
    // Validate signature length
    if (data.signature.length < 10) {
      console.error("Invalid signature length:", data.signature.length);
      throw new Error('Invalid signature format');
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
    
    console.log("Sending verification request to edge function");
    
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
    
    // Extract more readable error info from response if available
    if (error.context && error.context.response) {
      try {
        const errorBody = await error.context.response.text();
        console.error('Error response body:', errorBody);
        
        try {
          const parsedError = JSON.parse(errorBody);
          if (parsedError && parsedError.error) {
            throw new Error(parsedError.error + (parsedError.details ? `: ${parsedError.details}` : ''));
          }
        } catch (parseError) {
          // If we can't parse the JSON, use the raw text
          if (errorBody && errorBody.length > 0) {
            throw new Error(`Server error: ${errorBody.slice(0, 100)}`);
          }
        }
      } catch (responseError) {
        console.error('Failed to parse error response:', responseError);
      }
    }
    
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
