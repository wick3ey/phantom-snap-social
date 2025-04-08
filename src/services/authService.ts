
import { NonceResponse, SignatureData, AuthSession } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

// Request a nonce from the Supabase Edge Function
export async function requestNonce(): Promise<NonceResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-phantom', {
      body: { action: 'getNonce' }
    });
    
    if (error) {
      throw new Error(error.message || 'Failed to fetch nonce');
    }
    
    return data;
  } catch (error) {
    console.error('Error requesting nonce:', error);
    throw error;
  }
}

// Verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('auth-phantom', {
      body: {
        action: 'verifySignature',
        walletAddress: data.walletAddress,
        signature: data.signature,
        nonce: data.nonce
      }
    });
    
    if (error || !responseData) {
      throw new Error(error?.message || 'Verification failed');
    }
    
    return {
      userId: responseData.userId,
      token: responseData.token,
      walletAddress: responseData.walletAddress
    };
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
}
