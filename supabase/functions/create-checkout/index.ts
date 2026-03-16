import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Build CORS allowlist from environment variables
function buildAllowedOrigins(): string[] {
  const origins: string[] = [];
  const envKeys = ["APP_ORIGIN", "SITE_URL", "WEB_URL", "CUSTOM_DOMAIN"];
  for (const key of envKeys) {
    const val = Deno.env.get(key);
    if (val) origins.push(val.replace(/\/+$/, ""));
  }
  const extra = Deno.env.get("ALLOWED_ORIGINS");
  if (extra) {
    for (const o of extra.split(",")) {
      const trimmed = o.trim().replace(/\/+$/, "");
      if (trimmed) origins.push(trimmed);
    }
  }
  origins.push("http://localhost:5173", "http://localhost:8080");
  return [...new Set(origins)];
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes("*")) {
      const pattern = allowed.replace(/\./g, "\\.").replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return origin === allowed;
  }) || origin.endsWith(".lovable.dev") || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com");
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin: string;
  if (origin && isOriginAllowed(origin)) {
    allowedOrigin = origin;
  } else {
    const fallback = Deno.env.get("APP_ORIGIN") || Deno.env.get("SITE_URL") || Deno.env.get("WEB_URL");
    allowedOrigin = fallback || "https://preview--smartfit-starter.lovable.app";
  }
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function getAppOrigin(requestOrigin: string | null): string {
  if (requestOrigin && isOriginAllowed(requestOrigin)) return requestOrigin;
  const fallback = Deno.env.get("APP_ORIGIN") || Deno.env.get("SITE_URL") || Deno.env.get("WEB_URL");
  return fallback || "https://preview--smartfit-starter.lovable.app";
}

// Price ID: prefer env, fallback to hardcoded default
const DEFAULT_PREMIUM_PRICE_ID = "price_1SpBXMLtHQX7R8uhaSvARvLA";
const PREMIUM_PRICE_ID = (Deno.env.get("STRIPE_PRICE_ID") ?? "").trim() || DEFAULT_PREMIUM_PRICE_ID;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { priceId: PREMIUM_PRICE_ID });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("Missing or invalid authorization header");
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = claimsData.user;
    if (!user.email) {
      logStep("User has no email");
      return new Response(JSON.stringify({ error: "User email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve all customers for this email (limit 10 to catch duplicates)
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let customerId: string | undefined;

    // Check for existing active/trialing subscription across ALL customers
    for (const cust of customers.data) {
      const [activeSubs, trialingSubs] = await Promise.all([
        stripe.subscriptions.list({ customer: cust.id, status: "active", limit: 1 }),
        stripe.subscriptions.list({ customer: cust.id, status: "trialing", limit: 1 }),
      ]);

      const existingSubs = [...activeSubs.data, ...trialingSubs.data];
      if (existingSubs.length > 0) {
        logStep("User already has active/trialing subscription", {
          customerId: cust.id,
          subscriptionId: existingSubs[0].id,
          status: existingSubs[0].status,
        });
        return new Response(JSON.stringify({
          error: "Você já possui uma assinatura ativa. Acesse o portal de assinatura para gerenciá-la.",
          code: "SUBSCRIPTION_EXISTS",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }

      // Use first customer found as fallback for checkout
      if (!customerId) {
        customerId = cust.id;
      }
    }

    if (customerId) {
      logStep("Using existing customer for checkout", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const appOrigin = getAppOrigin(origin);

    const session = await stripe.checkout.sessions.create({
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appOrigin}/dashboard?checkout=success`,
      cancel_url: `${appOrigin}/pricing?checkout=cancelled`,
      metadata: {
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
