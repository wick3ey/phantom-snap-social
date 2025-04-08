
export interface AuthSession {
  userId: string;
  token: string;
  walletAddress: string;
}

export interface SignatureData {
  walletAddress: string;
  signature: string;
  nonce: string;
  signedMessage: string;
}
