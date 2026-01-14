import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetricsRequest {
  startDate: string;
  endDate: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin using the has_role function
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { startDate, endDate }: MetricsRequest = await req.json();
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch all data in parallel
    const [
      profilesResult,
      onboardingResult,
      workoutPlansResult,
      sessionsResult,
      subscriptionsResult,
      streaksResult,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, user_id, created_at"),
      supabaseAdmin.from("user_onboarding_data").select("id, user_id, goal, created_at"),
      supabaseAdmin.from("workout_plans").select("id, user_id, is_active, created_at"),
      supabaseAdmin.from("workout_sessions").select("id, user_id, status, duration_minutes, perceived_effort, created_at, completed_at"),
      supabaseAdmin.from("subscriptions").select("id, user_id, plan_type, status, created_at"),
      supabaseAdmin.from("user_streaks").select("id, user_id, current_streak, longest_streak"),
    ]);

    const profiles = profilesResult.data || [];
    const onboarding = onboardingResult.data || [];
    const workoutPlans = workoutPlansResult.data || [];
    const sessions = sessionsResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const streaks = streaksResult.data || [];

    // Calculate summary metrics
    const totalUsers = profiles.length;
    const newUsersInPeriod = profiles.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= start && createdAt <= end;
    }).length;

    const usersWithOnboarding = new Set(onboarding.map(o => o.user_id)).size;
    const onboardingRate = totalUsers > 0 ? (usersWithOnboarding / totalUsers) * 100 : 0;

    const usersWithPlan = new Set(workoutPlans.filter(p => p.is_active).map(p => p.user_id)).size;

    const premiumSubscriptions = subscriptions.filter(s => s.plan_type === "premium" && s.status === "active");
    const premiumUsers = premiumSubscriptions.length;
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;
    const mrr = premiumUsers * 29.90; // R$ 29,90 per month

    // Sessions in period
    const sessionsInPeriod = sessions.filter(s => {
      const createdAt = new Date(s.created_at);
      return createdAt >= start && createdAt <= end;
    });

    const completedSessions = sessionsInPeriod.filter(s => s.status === "completed");
    const activeUsersInPeriod = new Set(sessionsInPeriod.map(s => s.user_id)).size;

    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;

    const sessionsWithRpe = completedSessions.filter(s => s.perceived_effort !== null);
    const avgRpe = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((acc, s) => acc + (s.perceived_effort || 0), 0) / sessionsWithRpe.length
      : 0;

    const completionRate = sessionsInPeriod.length > 0
      ? (completedSessions.length / sessionsInPeriod.length) * 100
      : 0;

    const avgStreak = streaks.length > 0
      ? streaks.reduce((acc, s) => acc + s.current_streak, 0) / streaks.length
      : 0;

    // Time series data (daily)
    const dailySignups: Record<string, number> = {};
    const dailySessions: Record<string, number> = {};
    const dailyConversions: Record<string, number> = {};

    profiles.forEach(p => {
      const date = p.created_at.split("T")[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    });

    sessions.forEach(s => {
      const date = s.created_at.split("T")[0];
      dailySessions[date] = (dailySessions[date] || 0) + 1;
    });

    subscriptions.filter(s => s.plan_type === "premium").forEach(s => {
      const date = s.created_at.split("T")[0];
      dailyConversions[date] = (dailyConversions[date] || 0) + 1;
    });

    // Convert to arrays sorted by date
    const formatTimeSeries = (data: Record<string, number>) => {
      return Object.entries(data)
        .map(([date, count]) => ({ date, count }))
        .filter(item => {
          const d = new Date(item.date);
          return d >= start && d <= end;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const response = {
      summary: {
        totalUsers,
        newUsersInPeriod,
        premiumUsers,
        conversionRate: Math.round(conversionRate * 10) / 10,
        mrr: Math.round(mrr * 100) / 100,
        activeUsersInPeriod,
      },
      engagement: {
        totalSessions: sessionsInPeriod.length,
        completedSessions: completedSessions.length,
        completionRate: Math.round(completionRate * 10) / 10,
        avgDuration: Math.round(avgDuration),
        avgRpe: Math.round(avgRpe * 10) / 10,
        avgStreak: Math.round(avgStreak * 10) / 10,
      },
      funnel: {
        signups: totalUsers,
        onboarded: usersWithOnboarding,
        withPlan: usersWithPlan,
        premium: premiumUsers,
      },
      timeSeries: {
        signups: formatTimeSeries(dailySignups),
        sessions: formatTimeSeries(dailySessions),
        conversions: formatTimeSeries(dailyConversions),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
