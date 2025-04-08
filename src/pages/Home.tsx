
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-solana-dark p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Phantom Snap</h1>
      
      <div className="space-y-6">
        <Card className="border-none shadow-lg bg-secondary/80 backdrop-blur">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium mb-2">Welcome to Phantom Snap!</h2>
            <p className="text-muted-foreground">
              The social app powered by Solana blockchain with Phantom wallet authentication.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-lg bg-secondary/80 backdrop-blur">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium mb-2">Features Coming Soon:</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Ephemeral image sharing</li>
              <li>Encrypted direct messaging</li>
              <li>Token-gated content</li>
              <li>NFT integration</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
