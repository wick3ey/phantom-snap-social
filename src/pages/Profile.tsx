
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from '@/services/profileService';
import { Profile as ProfileType } from '@/types/profile';
import { LogOut, Settings, Loader2 } from "lucide-react";

const Profile: React.FC = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) return;
      
      try {
        const profileData = await getProfile(session.token);
        setProfile(profileData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };
  
  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-solana-dark">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-solana-purple animate-spin" />
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-solana-dark">
        <Card className="w-full max-w-md border-none shadow-lg bg-secondary/80 backdrop-blur">
          <CardContent className="p-6 text-center">
            <p className="text-lg mb-4">Profile not found</p>
            <Button onClick={() => navigate('/profile/setup')} className="phantom-gradient">
              Complete Your Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-solana-dark">
      <div className="w-full max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
        
        {/* Profile Card */}
        <Card className="border-none shadow-lg bg-secondary/80 backdrop-blur overflow-hidden">
          {/* Profile Header */}
          <div className="h-24 phantom-gradient" />
          
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex justify-between">
              <Avatar className="h-24 w-24 border-4 border-secondary -mt-12">
                <AvatarImage src={profile.profile_image_url || undefined} alt={profile.username || 'User'} />
                <AvatarFallback className="text-xl font-semibold bg-solana-purple">
                  {(profile.display_name || profile.username || 'PS')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleEditProfile}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            
            {/* User Info */}
            <div className="mt-4 space-y-1">
              {profile.display_name && (
                <h2 className="text-xl font-semibold">{profile.display_name}</h2>
              )}
              
              <div className="flex items-center space-x-1">
                <p className="text-sm font-medium text-solana-purple">
                  @{profile.username || 'username'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="bg-solana-purple bg-opacity-20 text-solana-purple rounded-full px-2 py-0.5 text-xs">
                  {formatWalletAddress(profile.wallet_address)}
                </span>
              </div>
              
              {profile.bio && (
                <p className="mt-4 text-sm">{profile.bio}</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
