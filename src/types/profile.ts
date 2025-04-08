
export interface Profile {
  id: string;
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  username: string;
  display_name: string;
  bio: string;
}
