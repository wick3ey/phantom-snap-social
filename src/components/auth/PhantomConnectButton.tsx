
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { requestNonce, verifySignature } from '@/services/authService';

// Check if Phantom is installed and accessible
const isPhantomInstalled = (): boolean => {
  const phantom = (window as any).phantom;
  return phantom && phantom.solana && phantom.solana.isPhantom;
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
      
      // Connect to Phantom wallet
      const { publicKey } = await phantom.solana.connect();
      const walletAddress = publicKey.toString();

      toast({
        title: "Wallet Connected",
        description: "Now signing message to verify ownership...",
      });

      try {
        // Request a nonce from the server
        const nonceResponse = await requestNonce();
        console.log("Received nonce:", nonceResponse);

        // Prepare the message to be signed
        const message = new TextEncoder().encode(nonceResponse.nonce);
        
        // Request signature from the wallet
        const { signature } = await phantom.solana.signMessage(message, "utf8");
        
        // Convert signature to base64 string using our browser-compatible helper
        const signatureBase64 = toBase64(signature);
        
        console.log("Signature generated:", {
          signature: signatureBase64.substring(0, 10) + "...",
          walletAddress,
          nonce: nonceResponse.nonce.substring(0, 10) + "..."
        });
        
        // Verify the signature with our backend
        const authSession = await verifySignature({
          walletAddress,
          signature: signatureBase64,
          nonce: nonceResponse.nonce
        });

        console.log("Auth session received:", authSession);

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
        console.error("Authentication error:", authError);
        toast({
          title: "Authentication failed",
          description: authError.message || "Failed to authenticate with your wallet",
          variant: "destructive"
        });
      }
      
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
