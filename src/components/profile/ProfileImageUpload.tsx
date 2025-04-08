
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ 
  currentImageUrl, 
  onImageUpload,
  isLoading
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive"
      });
      return;
    }
    
    // Create local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload the file
    try {
      await onImageUpload(file);
      toast({
        title: "Image uploaded",
        description: "Your profile image was uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      console.error("Image upload error:", error);
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Get initials for avatar fallback
  const getInitials = () => {
    return "PS"; // Default for "Phantom Snap"
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
        <AvatarImage src={previewUrl || undefined} alt="Profile" />
        <AvatarFallback className="text-2xl bg-solana-purple text-white">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      
      <Button 
        onClick={handleButtonClick}
        variant="outline"
        disabled={isLoading}
        className="flex items-center space-x-2"
      >
        <Camera className="h-4 w-4" />
        <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
      </Button>
    </div>
  );
};

export default ProfileImageUpload;
