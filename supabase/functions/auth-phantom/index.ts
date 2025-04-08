
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as nacl from "https://esm.sh/tweetnacl@1.0.3"
import bs58 from "https://esm.sh/bs58@5.0.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins during development
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Credentials": "true"
};

interface RequestData {
  action: "verifySignature"
  walletAddress: string
  signature: string
  nonce: string
  signedMessage: string
  useSIWS: boolean
}

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Error converting base64 to Uint8Array:", error);
    throw new Error("Invalid base64 data");
  }
}

// Helper to verify SIWS signature
function verifySIWSSignature(signedMessage: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return nacl.sign.detached.verify(signedMessage, signature, publicKey);
  } catch (error) {
    console.error("Error during SIWS verification:", error);
    return false;
  }
}

serve(async (req) => {
  // Determine the origin
  const origin = req.headers.get('origin');
  console.log("Request from origin:", origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    // Log request headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://pdykttdsbbcanfjcbsct.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseServiceKey) {
      console.error("Missing Supabase service key");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    let data: RequestData;
    try {
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText) {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      data = JSON.parse(bodyText);
      console.log("Request data action:", data.action);
      console.log("Request data details:", {
        hasWalletAddress: !!data.walletAddress,
        hasSignature: !!data.signature, 
        hasNonce: !!data.nonce,
        hasSignedMessage: !!data.signedMessage
      });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: `Invalid request format: ${parseError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Handle signature verification (SIWS only)
    if (data.action === "verifySignature") {
      const { walletAddress, signature, signedMessage, nonce } = data;
      
      console.log("Verifying SIWS signature for wallet:", walletAddress);
      
      if (!walletAddress || !signature || !signedMessage) {
        console.error("Missing required parameters", {
          hasWalletAddress: !!walletAddress,
          hasSignature: !!signature,
          hasSignedMessage: !!signedMessage
        });
        return new Response(
          JSON.stringify({ error: "Missing required SIWS parameters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Verify the signature
      try {
        console.log("Attempting to decode signature and public key");
        
        let signatureBytes;
        try {
          signatureBytes = base64ToUint8Array(signature);
          console.log("Signature decoded successfully from base64, length:", signatureBytes.length);
        } catch (decodeError) {
          console.error("Failed to decode signature:", decodeError.message);
          return new Response(
            JSON.stringify({ error: `Invalid signature format: ${decodeError.message}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        let publicKeyBytes;
        try {
          // Sanitize wallet address in case it's not a clean base58 string
          const cleanWalletAddress = walletAddress.trim();
          console.log("Attempting to decode wallet address:", cleanWalletAddress);
          publicKeyBytes = bs58.decode(cleanWalletAddress);
          console.log("Public key decoded successfully, length:", publicKeyBytes.length);
        } catch (decodeError) {
          console.error("Failed to decode public key:", decodeError.message);
          return new Response(
            JSON.stringify({ error: `Invalid public key format: ${decodeError.message}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        let signedMessageBytes;
        try {
          signedMessageBytes = base64ToUint8Array(signedMessage);
          console.log("Signed message decoded successfully, length:", signedMessageBytes.length);
        } catch (decodeError) {
          console.error("Failed to decode signed message:", decodeError.message);
          return new Response(
            JSON.stringify({ error: `Invalid signed message format: ${decodeError.message}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Running SIWS verification check");
        
        const verified = verifySIWSSignature(signedMessageBytes, signatureBytes, publicKeyBytes);
        console.log("SIWS verification result:", verified);
        
        if (!verified) {
          console.error("Invalid SIWS signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Signature verified, checking for existing user");
        // Search for existing user
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("wallet_address", walletAddress)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return new Response(
            JSON.stringify({ error: profileError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        let userId: string;
        
        if (profiles) {
          // User exists
          console.log("User exists:", profiles.id);
          userId = profiles.id;
        } else {
          // Create a new user
          console.log("Creating new user for wallet:", walletAddress);
          const fakeEmail = `${walletAddress.slice(0, 10)}@phantom.solana.user`;
          const randomPassword = crypto.randomUUID();
          
          // Create user in auth.users
          const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
            email: fakeEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: { walletAddress }
          });
          
          if (createUserError || !newUser?.user) {
            console.error("Failed to create user:", createUserError);
            return new Response(
              JSON.stringify({ error: createUserError?.message || "Failed to create user" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          userId = newUser.user.id;
          
          // Create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              wallet_address: walletAddress
            });
          
          if (profileError) {
            console.error("Failed to create profile:", profileError);
            return new Response(
              JSON.stringify({ error: profileError.message }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
        
        console.log("Generating session link for user:", userId);
        
        // Determine the correct redirectTo URL based on origin
        let redirectTo = origin || 'https://dgfun.xyz';
        // Make sure the redirectTo URL ends with a trailing slash
        if (!redirectTo.endsWith('/')) {
          redirectTo += '/';
        }
        
        console.log("Using redirectTo URL:", redirectTo);
        
        // Create a custom token
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: `${walletAddress.slice(0, 10)}@phantom.solana.user`,
          options: {
            redirectTo
          }
        });
        
        if (sessionError || !sessionData) {
          console.error("Failed to generate session:", sessionError);
          return new Response(
            JSON.stringify({ error: sessionError?.message || "Failed to generate session" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Extract the token from the URL
        try {
          const actionLink = sessionData.properties.action_link;
          console.log("Generated action link:", actionLink);
          
          const properties = new URL(actionLink).searchParams;
          const token = properties.get('token');
          
          if (!token) {
            console.error("Token not found in action link");
            return new Response(
              JSON.stringify({ error: "Failed to generate valid authentication token" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          console.log("Session generated successfully");
          // Return the session info
          return new Response(
            JSON.stringify({
              userId,
              token,
              walletAddress,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        } catch (urlError) {
          console.error("Error parsing action link URL:", urlError);
          return new Response(
            JSON.stringify({ error: `Failed to parse action link: ${urlError.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (error) {
        console.error("Verification error:", error);
        return new Response(
          JSON.stringify({ error: `Failed to verify signature: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
})
