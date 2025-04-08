
import { Profile, ProfileFormData } from '@/types/profile';
import { supabase } from '@/integrations/supabase/client';

// Function to get the current user's profile
export async function getProfile(token: string): Promise<Profile> {
  try {
    // Setup auth header
    supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
    
    if (error) {
      throw new Error('Failed to fetch profile');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

// Function to update the user's profile
export async function updateProfile(token: string, profileData: ProfileFormData): Promise<Profile> {
  try {
    // Setup auth header
    supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: profileData.username,
        display_name: profileData.display_name,
        bio: profileData.bio
      })
      .select('*')
      .single();
    
    if (error) {
      throw new Error('Failed to update profile');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

// Function to upload a profile image
export async function uploadProfileImage(token: string, file: File): Promise<{ url: string }> {
  try {
    // Setup auth header
    supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    const user = supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('profile_images')
      .upload(filePath, file);
    
    if (uploadError) {
      throw uploadError;
    }
    
    const { data: urlData } = supabase.storage
      .from('profile_images')
      .getPublicUrl(filePath);
    
    // Update the profile with the new image URL
    await supabase
      .from('profiles')
      .update({
        profile_image_url: urlData.publicUrl
      });
    
    return { url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}
