
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as nacl from "https://esm.sh/tweetnacl@1.0.3"
import bs58 from "https://esm.sh/bs58@5.0.0"

// Set proper CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

// Helper to convert base64 to Uint8Array with robust error handling
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    console.log("Converting base64 string of length:", base64.length);
    
    // Normalize padding and characters
    const normalizedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = 4 - (normalizedBase64.length % 4);
    const paddedBase64 = paddingLength < 4 
      ? normalizedBase64 + '='.repeat(paddingLength) 
      : normalizedBase64;
    
    const binary = atob(paddedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    console.log("Successfully converted base64 to Uint8Array, length:", bytes.length);
    return bytes;
  } catch (error) {
    console.error("Error converting base64 to Uint8Array:", error);
    throw new Error(`Invalid base64 data: ${error.message}`);
  }
}

// Helper to verify SIWS signature with improved error handling
function verifySIWSSignature(signedMessage: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    console.log("Verification details:", {
      signedMessageLength: signedMessage.length,
      signatureLength: signature.length,
      publicKeyLength: publicKey.length
    });
    
    if (signature.length !== 64) {
      console.error(`Invalid signature length: ${signature.length}. Expected 64 bytes.`);
      return false;
    }
    
    if (publicKey.length !== 32) {
      console.error(`Invalid public key length: ${publicKey.length}. Expected 32 bytes.`);
      return false;
    }
    
    return nacl.sign.detached.verify(signedMessage, signature, publicKey);
  } catch (error) {
    console.error("Error during SIWS verification:", error);
    return false;
  }
}

serve(async (req) => {
  // Extract origin for CORS handling
  const origin = req.headers.get('origin') || "*";
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error", details: "Missing Supabase configuration" }),
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

    // Parse and validate request body
    let data: RequestData;
    try {
      const bodyText = await req.text();
      console.log("Raw request body length:", bodyText.length);
      console.log("Raw request body (first 200 chars):", bodyText.substring(0, 200));
      
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
      
      try {
        data = JSON.parse(bodyText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        return new Response(
          JSON.stringify({ error: `Invalid JSON format: ${parseError.message}`, receivedBody: bodyText.substring(0, 200) }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("Parsed request data action:", data.action);
      console.log("Request data details:", {
        hasWalletAddress: !!data.walletAddress,
        hasSignature: !!data.signature, 
        hasNonce: !!data.nonce,
        hasSignedMessage: !!data.signedMessage,
        signatureLength: data.signature?.length,
        walletAddressLength: data.walletAddress?.length,
        signedMessageLength: data.signedMessage?.length,
      });
      
      // Validate required fields
      if (!data.action || data.action !== "verifySignature") {
        return new Response(
          JSON.stringify({ error: "Invalid or missing action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (!data.walletAddress || !data.signature || !data.signedMessage) {
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters",
            details: {
              hasWalletAddress: !!data.walletAddress,
              hasSignature: !!data.signature,
              hasSignedMessage: !!data.signedMessage
            }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
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
    
    // Handle signature verification
    if (data.action === "verifySignature") {
      const { walletAddress, signature, signedMessage, nonce } = data;
      
      console.log("Verifying SIWS signature for wallet:", walletAddress);
      
      // Decode and verify signature data
      try {
        // Decode signature
        let signatureBytes;
        try {
          signatureBytes = base64ToUint8Array(signature);
          console.log("Signature decoded successfully from base64, length:", signatureBytes.length);
        } catch (decodeError) {
          console.error("Failed to decode signature:", decodeError.message);
          return new Response(
            JSON.stringify({ 
              error: `Invalid signature format`, 
              details: decodeError.message,
              signature: signature.substring(0, 20) + "..." // Show partial for debugging
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Decode wallet address (public key)
        let publicKeyBytes;
        try {
          // Normalize wallet address
          const cleanWalletAddress = walletAddress.trim();
          console.log("Attempting to decode wallet address:", cleanWalletAddress);
          publicKeyBytes = bs58.decode(cleanWalletAddress);
          console.log("Public key decoded successfully, length:", publicKeyBytes.length);
          
          // Validate key length for ED25519 (32 bytes)
          if (publicKeyBytes.length !== 32) {
            console.error("Invalid public key length:", publicKeyBytes.length);
            return new Response(
              JSON.stringify({ 
                error: "Invalid public key format", 
                details: `Expected 32 bytes, got ${publicKeyBytes.length}` 
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch (decodeError) {
          console.error("Failed to decode public key:", decodeError.message);
          return new Response(
            JSON.stringify({ 
              error: `Invalid wallet address format`, 
              details: decodeError.message,
              walletAddress: walletAddress
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Decode signed message
        let signedMessageBytes;
        try {
          signedMessageBytes = base64ToUint8Array(signedMessage);
          console.log("Signed message decoded successfully, length:", signedMessageBytes.length);
        } catch (decodeError) {
          console.error("Failed to decode signed message:", decodeError.message);
          return new Response(
            JSON.stringify({ 
              error: `Invalid signed message format`, 
              details: decodeError.message,
              signedMessage: signedMessage.substring(0, 20) + "..." // Show partial for debugging
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Running SIWS verification check");
        
        // Verify signature
        const verified = verifySIWSSignature(signedMessageBytes, signatureBytes, publicKeyBytes);
        console.log("SIWS verification result:", verified);
        
        if (!verified) {
          console.error("Invalid SIWS signature");
          return new Response(
            JSON.stringify({ 
              error: "Invalid signature", 
              details: "Signature verification failed"
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Signature verified, checking for existing user");
        
        // Find or create user
        try {
          // Search for existing user
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("wallet_address", walletAddress)
            .maybeSingle();
          
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return new Response(
              JSON.stringify({ 
                error: "Database error", 
                details: profileError.message 
              }),
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
                JSON.stringify({ 
                  error: "User creation failed", 
                  details: createUserError?.message || "Failed to create user" 
                }),
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
                JSON.stringify({ 
                  error: "Profile creation failed", 
                  details: profileError.message 
                }),
                {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
          }
          
          console.log("Generating session link for user:", userId);
          
          // Determine redirectTo URL
          let redirectTo = origin || 'https://dgfun.xyz';
          if (!redirectTo.endsWith('/')) {
            redirectTo += '/';
          }
          
          console.log("Using redirectTo URL:", redirectTo);
          
          // Create authentication token
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
              JSON.stringify({ 
                error: "Session generation failed", 
                details: sessionError?.message || "Failed to generate session" 
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
  
          // Extract token from URL
          try {
            const actionLink = sessionData.properties.action_link;
            console.log("Generated action link:", actionLink);
            
            const properties = new URL(actionLink).searchParams;
            const token = properties.get('token');
            
            if (!token) {
              console.error("Token not found in action link");
              return new Response(
                JSON.stringify({ 
                  error: "Token extraction failed", 
                  details: "Failed to generate valid authentication token" 
                }),
                {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
            
            console.log("Session generated successfully");
            
            // Return success response
            return new Response(
              JSON.stringify({
                userId,
                token,
                walletAddress,
                status: "success"
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          } catch (urlError) {
            console.error("Error parsing action link URL:", urlError);
            return new Response(
              JSON.stringify({ 
                error: "URL parsing failed", 
                details: `Failed to parse action link: ${urlError.message}` 
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch (dbError) {
          console.error("Database operation error:", dbError);
          return new Response(
            JSON.stringify({ 
              error: "Database operation failed", 
              details: dbError.message 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (verificationError) {
        console.error("Verification process error:", verificationError);
        return new Response(
          JSON.stringify({ 
            error: "Verification process failed", 
            details: verificationError.message 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action", details: `Action '${data?.action}' not supported` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Uncaught server error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        details: error.message || "An unexpected error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
})
