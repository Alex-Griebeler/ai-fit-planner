import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "status" | "start" | "end" | "update";

interface BetaRequest {
  action?: Action;
  maxSlots?: number;
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new HttpError(500, "Missing Supabase environment variables");
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new HttpError(401, "Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new HttpError(403, "Forbidden - Admin access required");

    let body: BetaRequest = {};
    try {
      body = await req.json();
    } catch {
      // allow empty body for status
    }
    const action: Action = body.action ?? "status";

    if (action === "status") {
      const { data: config, error: cfgErr } = await supabase
        .from("beta_premium_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (cfgErr) throw new HttpError(500, cfgErr.message);

      // List beta beneficiaries
      const { data: subs, error: subsErr } = await supabase
        .from("subscriptions")
        .select("user_id, plan_type, status, current_period_end, created_at")
        .eq("is_beta_grant", true)
        .order("created_at", { ascending: false });
      if (subsErr) throw new HttpError(500, subsErr.message);

      // Resolve emails from auth
      const beneficiaries: Array<{
        user_id: string;
        email: string | null;
        plan_type: string;
        status: string;
        current_period_end: string | null;
        created_at: string;
      }> = [];

      const ids = new Set((subs ?? []).map((s) => s.user_id));
      if (ids.size > 0) {
        // Fetch all users (paginate) and map by id
        const idToEmail = new Map<string, string | null>();
        let page = 1;
        const perPage = 1000;
        while (page <= 50) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
          if (error) throw new HttpError(500, error.message);
          for (const u of data.users) {
            if (ids.has(u.id)) idToEmail.set(u.id, u.email ?? null);
          }
          if (data.users.length < perPage) break;
          page += 1;
        }
        for (const s of subs ?? []) {
          beneficiaries.push({
            user_id: s.user_id,
            email: idToEmail.get(s.user_id) ?? null,
            plan_type: s.plan_type,
            status: s.status,
            current_period_end: s.current_period_end,
            created_at: s.created_at,
          });
        }
      }

      return jsonResponse({ config, beneficiaries });
    }

    if (action === "start" || action === "update") {
      const maxSlots = Math.min(Math.max(body.maxSlots ?? 30, 1), 1000);
      const durationDays = Math.min(Math.max(body.durationDays ?? 30, 1), 3650);

      const { data: current } = await supabase
        .from("beta_premium_config")
        .select("slots_used")
        .eq("id", 1)
        .maybeSingle();
      const slotsUsed = current?.slots_used ?? 0;

      const { data, error } = await supabase
        .from("beta_premium_config")
        .upsert(
          {
            id: 1,
            is_active: true,
            max_slots: maxSlots,
            slots_used: slotsUsed,
            default_duration_days: durationDays,
            started_at: action === "start" ? new Date().toISOString() : undefined,
            ended_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select()
        .maybeSingle();
      if (error) throw new HttpError(500, error.message);
      return jsonResponse({ success: true, config: data });
    }

    if (action === "end") {
      // 1. Disable beta
      const { error: cfgErr } = await supabase
        .from("beta_premium_config")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (cfgErr) throw new HttpError(500, cfgErr.message);

      // 2. Revoke beta grants — but skip users who upgraded to paid Stripe
      const { data: revokeTargets, error: selErr } = await supabase
        .from("subscriptions")
        .select("user_id, stripe_subscription_id")
        .eq("is_beta_grant", true)
        .eq("plan_type", "premium");
      if (selErr) throw new HttpError(500, selErr.message);

      const toRevoke = (revokeTargets ?? []).filter((r) => !r.stripe_subscription_id);
      let revoked = 0;
      if (toRevoke.length > 0) {
        const ids = toRevoke.map((r) => r.user_id);
        const { error: updErr, count } = await supabase
          .from("subscriptions")
          .update(
            {
              plan_type: "free",
              status: "canceled",
              current_period_end: new Date().toISOString(),
              is_beta_grant: false,
              updated_at: new Date().toISOString(),
            },
            { count: "exact" },
          )
          .in("user_id", ids);
        if (updErr) throw new HttpError(500, updErr.message);
        revoked = count ?? toRevoke.length;
      }

      return jsonResponse({
        success: true,
        revoked,
        skipped_paid: (revokeTargets?.length ?? 0) - toRevoke.length,
      });
    }

    throw new HttpError(400, "Invalid action");
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("admin-beta-premium error:", message);
    return jsonResponse({ error: message }, status);
  }
});
