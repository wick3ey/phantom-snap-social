
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
        description: "Your Phantom wallet is now connected",
      });

      // Request a nonce from the server
      const { nonce } = await requestNonce();

      // Prepare the message to be signed
      const message = new TextEncoder().encode(nonce);
      
      // Request signature from the wallet
      const { signature } = await phantom.solana.signMessage(message, "utf8");
      
      // Convert signature to base58 string
      const signatureBase58 = signature.toString();
      
      // Verify the signature with our backend
      const authSession = await verifySignature({
        walletAddress,
        signature: signatureBase58,
        nonce
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
