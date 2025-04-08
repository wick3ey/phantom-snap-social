
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Index: React.FC = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Wait for auth state to be determined
    if (!loading) {
      if (session) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-solana-dark">
      <div className="animate-pulse-soft">
        <div className="h-20 w-20 mx-auto mb-4 phantom-gradient rounded-2xl flex items-center justify-center">
          <span className="text-4xl font-bold text-white">PS</span>
        </div>
        <p className="text-center text-white font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
