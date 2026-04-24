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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PushPayload = await req.json();
    if (!payload?.userId || !payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    const canSend = isAdmin === true || payload.userId === authData.user.id;
    if (!canSend) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint")
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
        const success = await sendWebPush({
          endpoint: sub.endpoint,
          payload: notificationPayload,
        });

        return { endpoint: sub.endpoint, success };
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

    const successful = results.filter(
      (r): r is PromiseFulfilledResult<{ endpoint: string; success: boolean }> =>
        r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.length - successful;

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
  payload: string;
}): Promise<boolean> {
  try {
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
