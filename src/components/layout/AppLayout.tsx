
import React from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/profile/setup';
  
  return (
    <div className="min-h-screen bg-background mobile-container">
      <main className="pb-16">
        {children}
      </main>
      
      {!isAuthPage && <BottomNav />}
    </div>
  );
};

export default AppLayout;
