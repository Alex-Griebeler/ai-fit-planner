-- Harden data integrity for monetization/session tables without breaking existing data.
-- Uses NOT VALID constraints so legacy rows are not blocked immediately.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_sessions_sets_integrity_check'
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_sets_integrity_check
      CHECK (
        total_sets >= 0
        AND completed_sets >= 0
        AND completed_sets <= total_sets
      )
      NOT VALID;
  END IF;
END
$$;
