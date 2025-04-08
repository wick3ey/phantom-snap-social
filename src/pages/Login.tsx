
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PhantomConnectButton from '@/components/auth/PhantomConnectButton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Login: React.FC = () => {
  const { session, loading } = useAuth();

  // If already authenticated, redirect to home
  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-solana-dark">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-20 w-20 mx-auto mb-4 phantom-gradient rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-white">PS</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Phantom Snap</h1>
          <p className="text-gray-400">Connect your wallet to get started</p>
        </div>

        <Card className="border-none shadow-xl bg-secondary/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Use your Phantom wallet to authenticate
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PhantomConnectButton />
          </CardContent>
          <CardFooter>
            <p className="px-2 text-sm text-center text-muted-foreground w-full">
              By connecting, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Don't have Phantom wallet?</p>
          <a 
            href="https://phantom.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-solana-purple hover:underline"
          >
            Download Phantom
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
