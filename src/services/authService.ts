
import { NonceResponse, SignatureData, AuthSession } from '@/types/auth';

// Replace with your actual API URL
const API_URL = 'https://api.example.com';

// Function to request a nonce from the server
export async function requestNonce(): Promise<NonceResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/nonce`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch nonce');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error requesting nonce:', error);
    throw error;
  }
}

// Function to verify a signature and get a session token
export async function verifySignature(data: SignatureData): Promise<AuthSession> {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Verification failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
}
