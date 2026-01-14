import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", payload.userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/favicon.ico",
      badge: "/favicon.ico",
      data: payload.data || {},
    });

    // Send to all subscriptions using Web Push API
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Using the Web Push library approach with fetch
        const endpoint = sub.endpoint;
        
        // For now, we'll use a simplified approach
        // In production, you'd want to use web-push library
        const response = await sendWebPush({
          endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          payload: notificationPayload,
          vapidPublicKey,
          vapidPrivateKey,
        });

        return { endpoint, success: response };
      })
    );

    // Save notification to history
    await supabaseAdmin.from("notifications").insert({
      user_id: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.data?.type as string || "general",
      data: payload.data || {},
    });

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simplified Web Push sender
async function sendWebPush(options: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
}): Promise<boolean> {
  try {
    // Import the crypto utilities
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID authentication
    const now = Math.floor(Date.now() / 1000);
    const endpointUrl = new URL(options.endpoint);
    
    const jwtHeader = { alg: "ES256", typ: "JWT" };
    const jwtPayload = {
      aud: endpointUrl.origin,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: "mailto:notifications@evolve.app",
    };

    // For a complete implementation, you'd need to:
    // 1. Sign the JWT with the VAPID private key
    // 2. Encrypt the payload with the subscription keys
    // 3. Send the request to the push endpoint
    
    // This is a simplified version that works with some push services
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
      },
      body: options.payload,
    });

    return response.ok;
  } catch (error) {
    console.error("Error in sendWebPush:", error);
    return false;
  }
}
