
import { SignatureData, AuthSession } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

// Verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    console.log("Verifying signature with edge function...", {
      walletAddress: data.walletAddress,
      signatureLength: data.signature.length,
      nonceLength: data.nonce.length,
      hasSignedMessage: !!data.signedMessage
    });
    
    const requestBody = {
      action: 'verifySignature',
      walletAddress: data.walletAddress,
      signature: data.signature,
      nonce: data.nonce,
      signedMessage: data.signedMessage,
      useSIWS: true
    };
    
    const { data: responseData, error } = await supabase.functions.invoke('auth-phantom', {
      body: requestBody
    });
    
    if (error) {
      console.error("Error in verify signature response:", error);
      throw new Error(error.message || 'Edge Function returned a non-2xx status code');
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
  } catch (error: any) {
    console.error('Error verifying signature:', error);
    throw new Error(error.message || 'Failed to verify signature');
  }
}
