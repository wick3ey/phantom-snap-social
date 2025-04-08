
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import ProfileForm from '@/components/profile/ProfileForm';
import ProfileImageUpload from '@/components/profile/ProfileImageUpload';
import { updateProfile, uploadProfileImage } from '@/services/profileService';
import { ProfileFormData } from '@/types/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSetup: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      await updateProfile(session.token, data);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been set up successfully",
      });
      
      navigate('/');
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageUpload = async (file: File) => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      await uploadProfileImage(session.token, file);
    } catch (error) {
      console.error("Image upload error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-solana-dark">
      <div className="flex-1 p-4 flex flex-col justify-center items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
            <p className="text-gray-400">Tell us about yourself</p>
          </div>
          
          <Card className="border-none shadow-lg bg-secondary/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Your Profile</CardTitle>
              <CardDescription>
                This information will be shown on your public profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProfileImageUpload 
                onImageUpload={handleImageUpload} 
                isLoading={isLoading}
              />
              
              <ProfileForm 
                onSubmit={handleProfileUpdate}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            All fields can be updated later from your profile settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
