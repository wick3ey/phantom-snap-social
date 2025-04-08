
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

// Helper to encode base64 string from Uint8Array
const toBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const PhantomConnectButton: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { setSession } = useAuth();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

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
      
      if (!output.account) {
        console.error("Output account is undefined:", output);
        throw new Error("Wallet did not return account information");
      }
      
      // Validate the output before proceeding
      if (!output.account.address) {
        console.error("Output account address is missing:", output.account);
        throw new Error("Invalid authentication response from wallet");
      }

      // Convert the output for our backend
      const walletAddress = output.account.address;
      
      // Ensure signature and signedMessage exist before proceeding
      if (!output.signature || !output.signedMessage) {
        console.error("Missing signature or signedMessage in authentication response", {
          hasSignature: !!output.signature,
          hasSignedMessage: !!output.signedMessage
        });
        throw new Error("Incomplete authentication response from wallet");
      }
      
      const signatureBase64 = toBase64(output.signature);
      const signedMessageBase64 = toBase64(output.signedMessage);

      // Verify the signature with our backend
      const authSession = await verifySignature({
        walletAddress,
        signature: signatureBase64,
        nonce: signInData.nonce || '', 
        signedMessage: signedMessageBase64
      });

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
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="phantom-gradient w-full text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
    >
      {isConnecting ? "Connecting..." : "Connect with Phantom"}
    </Button>
  );
};

export default PhantomConnectButton;
