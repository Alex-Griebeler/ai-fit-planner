import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const DEFAULT_FALLBACK_ORIGIN = "https://smartfit-starter.lovable.app";
const LOVABLE_SUFFIXES = [".lovable.dev", ".lovable.app", ".lovableproject.com"];
const ENV_ORIGIN_KEYS = ["APP_ORIGIN", "SITE_URL", "WEB_URL", "CUSTOM_DOMAIN", "ALLOWED_ORIGINS"];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function jsonResponse(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildAllowedOrigins(): string[] {
  const baseOrigins = [
    Deno.env.get("SUPABASE_URL") ?? "",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://lovable.dev",
    "https://www.lovable.dev",
  ];

  const envOrigins = ENV_ORIGIN_KEYS.flatMap((key) =>
    (Deno.env.get(key) ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  const normalized = [...baseOrigins, ...envOrigins]
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => (origin.startsWith("*.") ? origin.toLowerCase() : normalizeOrigin(origin)))
    .filter((origin): origin is string => Boolean(origin));

  return [...new Set(normalized)];
}

const ALLOWED_ORIGINS = buildAllowedOrigins();
const DEFAULT_APP_ORIGIN = normalizeOrigin(
  Deno.env.get("APP_ORIGIN")
  ?? Deno.env.get("SITE_URL")
  ?? Deno.env.get("WEB_URL")
  ?? "",
) ?? DEFAULT_FALLBACK_ORIGIN;

function matchesAllowedOrigin(origin: string, allowed: string): boolean {
  if (allowed.startsWith("*.")) {
    return origin.endsWith(allowed.slice(1));
  }
  return origin === allowed;
}

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some((allowed) => matchesAllowedOrigin(origin, allowed))
    || LOVABLE_SUFFIXES.some((suffix) => origin.endsWith(suffix));
}

function getFallbackOrigin(): string {
  return DEFAULT_APP_ORIGIN;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  const allowedOrigin = normalizedOrigin && isAllowedOrigin(normalizedOrigin)
    ? normalizedOrigin
    : getFallbackOrigin();

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function getSafeRequestOrigin(origin: string | null): string {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  return normalizedOrigin && isAllowedOrigin(normalizedOrigin)
    ? normalizedOrigin
    : getFallbackOrigin();
}

const DEFAULT_PREMIUM_PRICE_ID = "price_1SpBXMLtHQX7R8uhaSvARvLA";

function resolvePremiumPriceId(stripeKey: string): string {
  const configuredPriceId = (Deno.env.get("STRIPE_PRICE_ID") ?? "").trim();
  if (configuredPriceId) return configuredPriceId;

  const isLiveStripeKey = stripeKey.startsWith("sk_live") || stripeKey.startsWith("rk_live");
  if (isLiveStripeKey) {
    throw new HttpError(500, "STRIPE_PRICE_ID is not set");
  }

  return DEFAULT_PREMIUM_PRICE_ID;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

async function findExistingSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
    stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    }),
    stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    }),
  ]);

  return activeSubscriptions.data[0] ?? trialingSubscriptions.data[0] ?? null;
}

async function resolveCustomerForCheckout(
  stripe: Stripe,
  email: string,
): Promise<{ customerId: string | null; existingSubscription: Stripe.Subscription | null }> {
  const customers = await stripe.customers.list({ email, limit: 10 });
  if (customers.data.length === 0) {
    return { customerId: null, existingSubscription: null };
  }

  for (const customer of customers.data) {
    const existingSubscription = await findExistingSubscription(stripe, customer.id);
    if (existingSubscription) {
      return { customerId: customer.id, existingSubscription };
    }
  }

  return { customerId: customers.data[0].id, existingSubscription: null };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");
    const premiumPriceId = resolvePremiumPriceId(stripeKey);
    logStep("Price id resolved", { source: Deno.env.get("STRIPE_PRICE_ID") ? "env" : "default_test" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized - No valid authorization header");
    }
    logStep("Authorization header found");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      throw new HttpError(401, "Unauthorized - Invalid token");
    }
    
    const user = claimsData.user;
    if (!user.email) throw new HttpError(400, "User email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const { customerId, existingSubscription } = await resolveCustomerForCheckout(stripe, user.email);

    if (existingSubscription) {
      throw new HttpError(409, "User already has an active subscription");
    }

    if (customerId) {
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    // Get origin for redirect URLs
    const requestOrigin = getSafeRequestOrigin(origin);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: premiumPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${requestOrigin}/dashboard?checkout=success`,
      cancel_url: `${requestOrigin}/pricing?checkout=cancelled`,
      metadata: {
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url }, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorMessage = error instanceof HttpError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
    logStep("ERROR", { message: errorMessage });
    const clientErrorMessage = status >= 500 ? "Internal server error" : errorMessage;
    return jsonResponse({ error: clientErrorMessage }, status, corsHeaders);
  }
});
