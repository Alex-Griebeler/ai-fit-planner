
-- Hardening: session and subscription integrity constraints
-- Uses validation triggers (not CHECK constraints) per best practices

-- 1. Validation trigger for workout_sessions.status
CREATE OR REPLACE FUNCTION public.validate_session_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('in_progress', 'completed', 'abandoned') THEN
    RAISE EXCEPTION 'Invalid session status: %. Must be in_progress, completed, or abandoned.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_session_status
  BEFORE INSERT OR UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_session_status();

-- 2. Validation trigger for subscriptions.plan_type and status
CREATE OR REPLACE FUNCTION public.validate_subscription_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plan_type NOT IN ('free', 'premium') THEN
    RAISE EXCEPTION 'Invalid plan_type: %. Must be free or premium.', NEW.plan_type;
  END IF;
  IF NEW.status NOT IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete') THEN
    RAISE EXCEPTION 'Invalid subscription status: %. Must be active, canceled, past_due, trialing, or incomplete.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subscription_fields
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_fields();

-- 3. Index for faster subscription lookups by user_id + status
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions (user_id, status);

-- 4. Index for faster session queries by user_id + status
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status ON public.workout_sessions (user_id, status);

-- 5. Ensure completed sessions always have completed_at
CREATE OR REPLACE FUNCTION public.validate_session_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('completed', 'abandoned') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_session_completion
  BEFORE INSERT OR UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_session_completion();
