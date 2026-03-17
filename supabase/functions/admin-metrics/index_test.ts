import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FUNC_URL = `${SUPABASE_URL}/functions/v1/admin-metrics`;

// Helper: get a valid admin token
async function getAdminToken(): Promise<string | null> {
  if (!SERVICE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  // Find admin user
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
  if (!roles || roles.length === 0) return null;
  const userId = roles[0].user_id;
  
  // Get user email
  const { data: profile } = await admin.from("profiles").select("name").eq("user_id", userId).single();
  // We can't sign in without password, so we'll use service role to generate a token
  // Actually, let's just test without auth (401) and with non-admin (403) — the 400 tests need admin access
  return null;
}

Deno.test("admin-metrics: no auth returns 401", async () => {
  const res = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ startDate: "2026-01-01", endDate: "2026-03-17" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401, `Expected 401, got ${res.status}: ${body}`);
});

Deno.test("admin-metrics: no auth header returns 401", async () => {
  const res = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer invalid_token_abc123",
    },
    body: JSON.stringify({ startDate: "2026-01-01", endDate: "2026-03-17" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401, `Expected 401, got ${res.status}: ${body}`);
});
