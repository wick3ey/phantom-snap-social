
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { verifySignature } from '@/services/authService';
import { createSignInData } from '@/services/siwsService';
import type { SolanaSignInOutput } from "@solana/wallet-standard-features";

// Check if Phantom is installed and accessible
const isPhantomInstalled = (): boolean => {
  const phantom = (window as any).phantom;
  return phantom && phantom.solana && phantom.solana.isPhantom;
};

// Helper to check if wallet supports SIWS
const supportsSIWS = (phantom: any): boolean => {
  return phantom && phantom.solana && 'signIn' in phantom.solana;
};

// Helper to encode base64 string from Uint8Array with error handling
const toBase64 = (buffer: Uint8Array): string => {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty buffer provided");
    }
    
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch (error) {
    console.error("Base64 encoding error:", error);
    throw new Error(`Failed to encode to Base64: ${error.message}`);
  }
};

// Validate wallet address format
const validateWalletAddress = (address: string): boolean => {
  // Basic check for Solana address format (base58 encoding, proper length)
  return !!address && address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
};

const PhantomConnectButton: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { setSession } = useAuth();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Check if Phantom is installed
      if (!isPhantomInstalled()) {
        toast({
          title: "Phantom not found",
          description: "Please install the Phantom wallet extension",
          variant: "destructive"
        });
        return;
      }

      const phantom = (window as any).phantom;

      // Check if the wallet supports SIWS
      if (!supportsSIWS(phantom)) {
        toast({
          title: "Wallet not supported",
          description: "Your wallet does not support Sign In With Solana. Please update your Phantom wallet to the latest version.",
          variant: "destructive"
        });
        return;
      }

      await handleSIWS(phantom);
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionError(error.message || "Failed to connect to wallet");
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Phantom wallet",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSIWS = async (phantom: any) => {
    try {
      toast({
        title: "Connecting wallet",
        description: "Please approve the connection in your Phantom wallet",
      });

      // Create the SIWS input data
      const signInData = createSignInData();

      // Send the signInInput to Phantom and trigger sign-in
      const output = await phantom.solana.signIn(signInData);
      
      console.log("SIWS authentication successful:", output);
      
      // Log full output structure to debug
      if (!output) {
        console.error("Output from signIn is undefined or null");
        throw new Error("Invalid authentication response from wallet");
      }
      
      // Extract wallet address with validation
      let walletAddress: string;
      
      if (typeof output.address === 'string') {
        walletAddress = output.address;
      } else if (output.address && typeof output.address.toString === 'function') {
        walletAddress = output.address.toString();
      } else {
        console.error("Wallet address has unexpected format:", output.address);
        throw new Error("Wallet address format not supported");
      }
      
      // Validate wallet address format
      if (!validateWalletAddress(walletAddress)) {
        console.error("Invalid wallet address format:", walletAddress);
        throw new Error("Invalid wallet address format");
      }
      
      console.log("Using wallet address:", walletAddress);
      
      // Ensure signature and signedMessage exist before proceeding
      if (!output.signature || !output.signedMessage) {
        console.error("Missing signature or signedMessage in authentication response", {
          hasSignature: !!output.signature,
          hasSignedMessage: !!output.signedMessage
        });
        throw new Error("Incomplete authentication response from wallet");
      }

      // Convert binary data to base64 with error handling
      let signatureBase64: string;
      let signedMessageBase64: string;
      
      try {
        signatureBase64 = toBase64(output.signature);
        signedMessageBase64 = toBase64(output.signedMessage);
        
        console.log("Encoded signature length:", signatureBase64.length);
        console.log("Encoded message length:", signedMessageBase64.length);
        
        if (!signatureBase64 || !signedMessageBase64) {
          throw new Error("Failed to encode signature or message");
        }
      } catch (encodeError: any) {
        console.error("Error encoding signature data:", encodeError);
        throw new Error(`Data encoding error: ${encodeError.message}`);
      }

      // Verify the signature with retries
      let retryCount = 0;
      let authSession = null;
      let lastError = null;
      
      while (retryCount < 3 && !authSession) {
        try {
          authSession = await verifySignature({
            walletAddress,
            signature: signatureBase64,
            nonce: signInData.nonce || '', 
            signedMessage: signedMessageBase64
          });
          break;
        } catch (verifyError: any) {
          console.warn(`Verification attempt ${retryCount + 1} failed:`, verifyError);
          lastError = verifyError;
          retryCount++;
          
          if (retryCount < 3) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!authSession) {
        throw lastError || new Error("Failed to verify wallet signature after multiple attempts");
      }

      // Update auth context with the session
      setSession({
        ...authSession,
        walletAddress
      });

      toast({
        title: "Authentication successful",
        description: "You're now signed in with your Phantom wallet",
      });
    } catch (authError: any) {
      console.error("SIWS Authentication error:", authError);
      toast({
        title: "Authentication failed",
        description: authError.message || "Failed to authenticate with your wallet",
        variant: "destructive"
      });
      throw authError;
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="phantom-gradient w-full text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
      >
        {isConnecting ? "Connecting..." : "Connect with Phantom"}
      </Button>
      
      {connectionError && (
        <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
          <p className="font-medium">Connection error:</p>
          <p>{connectionError}</p>
          <p className="text-xs mt-1">Please try again or refresh the page.</p>
        </div>
      )}
    </div>
  );
};

export default PhantomConnectButton;
