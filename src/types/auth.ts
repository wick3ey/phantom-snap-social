
export interface AuthSession {
  userId: string;
  token: string;
  walletAddress: string;
}

export interface NonceResponse {
  nonce: string;
  expiresAt: number;
}

export interface SignatureData {
  walletAddress: string;
  signature: string;
  nonce: string;
  signedMessage?: string;
}
