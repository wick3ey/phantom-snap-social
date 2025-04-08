
import { NonceResponse, SignatureData, AuthSession } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

// Request a nonce from the Supabase Edge Function
export async function requestNonce(): Promise<NonceResponse> {
  try {
    console.log("Requesting nonce from edge function...");
    const { data, error } = await supabase.functions.invoke('auth-phantom', {
      body: { action: 'getNonce' }
    });
    
    if (error) {
      console.error("Error in nonce request:", error);
      throw new Error(error.message || 'Failed to fetch nonce');
    }
    
    return data;
  } catch (error) {
    console.error('Error requesting nonce:', error);
    throw new Error('Failed to send a request to the Edge Function');
  }
}

// Verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    console.log("Verifying signature with edge function...", {
      walletAddress: data.walletAddress,
      signatureLength: data.signature.length,
      nonceLength: data.nonce.length
    });
    
    const { data: responseData, error } = await supabase.functions.invoke('auth-phantom', {
      body: {
        action: 'verifySignature',
        walletAddress: data.walletAddress,
        signature: data.signature,
        nonce: data.nonce
      }
    });
    
    if (error) {
      console.error("Error in verify signature response:", error);
      throw new Error('Edge Function returned a non-2xx status code');
    }
    
    if (!responseData) {
      console.error("No data returned from verify signature endpoint");
      throw new Error('Verification failed - no data returned');
    }
    
    console.log("Signature verification successful:", responseData);
    
    return {
      userId: responseData.userId,
      token: responseData.token,
      walletAddress: responseData.walletAddress
    };
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw new Error('Edge Function returned a non-2xx status code');
  }
}
