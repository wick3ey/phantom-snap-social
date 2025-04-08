
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as nacl from "https://esm.sh/tweetnacl@1.0.3"
import bs58 from "https://esm.sh/bs58@5.0.0"

const allowedOrigins = [
  "https://dgfun.xyz",
  "https://auth.dgfun.xyz",
  "http://localhost:5173"  // For local development
];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Credentials": "true"
});

interface RequestData {
  action: "getNonce" | "verifySignature"
  walletAddress?: string
  signature?: string
  nonce?: string
}

serve(async (req) => {
  // Determine the origin
  const origin = req.headers.get('origin');
  console.log("Request from origin:", origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      headers: corsHeaders(origin),
      status: 200,
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://pdykttdsbbcanfjcbsct.supabase.co"
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Parse request body
    const data: RequestData = await req.json()
    
    // Handle nonce generation
    if (data.action === "getNonce") {
      // Generate a random nonce
      const nonce = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 5) // Expires in 5 minutes
      
      console.log("Generated nonce:", nonce);
      
      return new Response(
        JSON.stringify({
          nonce,
          expiresAt: expiresAt.getTime(),
        }),
        {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 200,
        }
      )
    }
    
    // Handle signature verification
    else if (data.action === "verifySignature") {
      const { walletAddress, signature, nonce } = data
      
      console.log("Verifying signature for wallet:", walletAddress);
      console.log("Nonce:", nonce);
      
      if (!walletAddress || !signature || !nonce) {
        console.error("Missing required parameters");
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          }
        )
      }
      
      // Verify the signature
      try {
        console.log("Decoding signature and public key");
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(walletAddress);
        const messageBytes = new TextEncoder().encode(nonce);
        
        console.log("Running verification");
        const verified = nacl.sign.detached.verify(
          messageBytes, 
          signatureBytes, 
          publicKeyBytes
        );
        
        console.log("Verification result:", verified);
        
        if (!verified) {
          console.error("Invalid signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            {
              status: 401,
              headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            }
          )
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
              headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
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
                headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
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
                headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
              }
            );
          }
        }
        
        console.log("Generating session link for user:", userId);
        // Create a custom token
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: `${walletAddress.slice(0, 10)}@phantom.solana.user`,
          options: {
            redirectTo: origin || '/',
          }
        });
        
        if (sessionError || !sessionData) {
          console.error("Failed to generate session:", sessionError);
          return new Response(
            JSON.stringify({ error: sessionError?.message || "Failed to generate session" }),
            {
              status: 500,
              headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            }
          );
        }

        // Extract the token from the URL
        const properties = new URL(sessionData.properties.action_link).searchParams;
        const token = properties.get('token');
        
        console.log("Session generated successfully");
        // Return the session info
        return new Response(
          JSON.stringify({
            userId,
            token,
            walletAddress,
          }),
          {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("Verification error:", error);
        return new Response(
          JSON.stringify({ error: `Failed to verify signature: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
})
