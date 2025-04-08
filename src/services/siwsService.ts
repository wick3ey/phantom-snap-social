
import { SolanaSignInInput } from "@solana/wallet-standard-features";

// Create standardized Sign In With Solana input data
export const createSignInData = (): SolanaSignInInput => {
  const now = new Date();
  const uri = window.location.href;
  const currentUrl = new URL(uri);
  const domain = currentUrl.host;
  const currentDateTime = now.toISOString();

  // Create a standardized SIWS input object according to the specification
  const signInData: SolanaSignInInput = {
    domain,
    statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
    version: "1",
    nonce: generateNonce(),
    chainId: "mainnet",
    issuedAt: currentDateTime,
    resources: ["https://dgfun.xyz"]
  };

  return signInData;
};

// Generate a random nonce (at least 8 characters as required by the spec)
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
