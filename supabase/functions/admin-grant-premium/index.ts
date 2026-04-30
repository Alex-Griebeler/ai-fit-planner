import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GrantRequest {
  email?: string;
  action?: "grant" | "revoke";
  durationDays?: number;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpError(500, "Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      throw new HttpError(401, "Unauthorized");
    }
    const callerId = userData.user.id;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      throw new HttpError(403, "Forbidden - Admin access required");
    }

    let body: GrantRequest;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const action = body.action ?? "grant";
    const durationDays = Math.min(Math.max(body.durationDays ?? 365, 1), 3650);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Invalid email");
    }
    if (action !== "grant" && action !== "revoke") {
      throw new HttpError(400, "Invalid action");
    }

    // Find user by email by paginating auth.users (no direct query API).
    let targetUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (page <= 50) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new HttpError(500, error.message);
      const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) {
        targetUserId = found.id;
        break;
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    if (!targetUserId) {
      return jsonResponse({ error: "user_not_found", email }, 404);
    }

    if (action === "revoke") {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: targetUserId,
            plan_type: "free",
            status: "active",
            current_period_end: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw new HttpError(500, error.message);
      return jsonResponse({ success: true, action, email, user_id: targetUserId });
    }

    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Try update first; if no rows, insert.
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_type: "premium",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);
      if (error) throw new HttpError(500, error.message);
    } else {
      const { error } = await supabaseAdmin.from("subscriptions").insert({
        user_id: targetUserId,
        plan_type: "premium",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
      });
      if (error) throw new HttpError(500, error.message);
    }

    return jsonResponse({
      success: true,
      action,
      email,
      user_id: targetUserId,
      current_period_end: periodEnd,
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("admin-grant-premium error:", message);
    return jsonResponse({ error: message }, status);
  }
});
