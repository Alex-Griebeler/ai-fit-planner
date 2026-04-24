-- Complete integrity hardening for sessions and subscriptions.
-- This is idempotent and only enforces states already used by the app.

CREATE OR REPLACE FUNCTION public.validate_workout_session_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('in_progress', 'completed', 'abandoned') THEN
    RAISE EXCEPTION 'Invalid session status: %. Must be in_progress, completed, or abandoned.', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_session_status ON public.workout_sessions;

CREATE TRIGGER trg_validate_session_status
BEFORE INSERT OR UPDATE OF status ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_workout_session_status();

CREATE OR REPLACE FUNCTION public.validate_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan_type IS NULL OR NEW.plan_type NOT IN ('free', 'premium') THEN
    RAISE EXCEPTION 'Invalid subscription plan_type: %. Must be free or premium.', NEW.plan_type;
  END IF;

  IF NEW.status IS NULL OR NEW.status NOT IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete') THEN
    RAISE EXCEPTION 'Invalid subscription status: %. Must be active, canceled, past_due, trialing, or incomplete.', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_subscription_fields ON public.subscriptions;

CREATE TRIGGER trg_validate_subscription_fields
BEFORE INSERT OR UPDATE OF plan_type, status ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.validate_subscription_fields();

CREATE OR REPLACE FUNCTION public.set_workout_session_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('completed', 'abandoned') AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_workout_session_completed_at ON public.workout_sessions;

CREATE TRIGGER trg_set_workout_session_completed_at
BEFORE INSERT OR UPDATE OF status ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_workout_session_completed_at();

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status
  ON public.workout_sessions(user_id, status);
