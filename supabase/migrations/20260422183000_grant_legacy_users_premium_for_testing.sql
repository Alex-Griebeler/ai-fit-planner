-- Grant PREMIUM access to legacy users for testing without changing
-- the default behavior for new signups.
--
-- Scope:
-- - Existing users (already in public.profiles at execution time)
-- - Keeps handle_new_user_subscription() unchanged (new users remain free)
--
-- Safety:
-- - Stores previous state in backup table for rollback.
-- - Idempotent (safe to run more than once).

CREATE TABLE IF NOT EXISTS public.legacy_premium_access_backup (
  user_id uuid PRIMARY KEY,
  had_subscription boolean NOT NULL,
  previous_plan_type text,
  previous_status text,
  previous_current_period_start timestamptz,
  previous_current_period_end timestamptz,
  captured_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'legacy_premium_access_backup_user_id_fkey'
  ) THEN
    ALTER TABLE public.legacy_premium_access_backup
      ADD CONSTRAINT legacy_premium_access_backup_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- 1) Backup users that already have subscription rows.
INSERT INTO public.legacy_premium_access_backup (
  user_id,
  had_subscription,
  previous_plan_type,
  previous_status,
  previous_current_period_start,
  previous_current_period_end,
  captured_at
)
SELECT
  s.user_id,
  true,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  now()
FROM public.subscriptions s
JOIN public.profiles p ON p.user_id = s.user_id
LEFT JOIN public.legacy_premium_access_backup b ON b.user_id = s.user_id
WHERE b.user_id IS NULL;

-- 2) Backup legacy users that do not yet have a subscription row.
INSERT INTO public.legacy_premium_access_backup (
  user_id,
  had_subscription,
  previous_plan_type,
  previous_status,
  previous_current_period_start,
  previous_current_period_end,
  captured_at
)
SELECT
  p.user_id,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  now()
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
LEFT JOIN public.legacy_premium_access_backup b ON b.user_id = p.user_id
WHERE s.user_id IS NULL
  AND b.user_id IS NULL;

-- 3) Create missing subscription rows as premium active.
INSERT INTO public.subscriptions (
  user_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
SELECT
  p.user_id,
  'premium',
  'active',
  now(),
  NULL,
  now(),
  now()
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
WHERE s.user_id IS NULL;

-- 4) Promote existing legacy subscriptions to premium active.
-- Keep it restricted to non-premium-active rows to avoid mutating
-- already valid premium subscriptions.
UPDATE public.subscriptions s
SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = COALESCE(s.current_period_start, now()),
  current_period_end = NULL,
  updated_at = now()
FROM public.profiles p
WHERE p.user_id = s.user_id
  AND (
    s.plan_type IS DISTINCT FROM 'premium'
    OR s.status IS DISTINCT FROM 'active'
  );
