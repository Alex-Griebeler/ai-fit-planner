-- Restore default subscription behavior for new signups.
-- A previous migration set all users to premium; this keeps existing users untouched
-- and only changes the default for users created from now on.

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.user_id, 'free', 'active');
  RETURN NEW;
END;
$function$;

-- Keep profile weight aligned with UI input (decimal support, e.g. 72.5kg).
ALTER TABLE public.profiles
  ALTER COLUMN weight TYPE numeric(5,1)
  USING weight::numeric;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_weight_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weight_check
  CHECK (weight IS NULL OR (weight >= 30 AND weight <= 300));

-- Clean up potential duplicates before enforcing one active in-progress session per user.
WITH ranked_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY started_at DESC, created_at DESC
    ) AS rn
  FROM public.workout_sessions
  WHERE status = 'in_progress'
)
UPDATE public.workout_sessions ws
SET
  status = 'abandoned',
  completed_at = COALESCE(ws.completed_at, now())
FROM ranked_sessions rs
WHERE ws.id = rs.id
  AND rs.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_one_in_progress_per_user
  ON public.workout_sessions(user_id)
  WHERE status = 'in_progress';