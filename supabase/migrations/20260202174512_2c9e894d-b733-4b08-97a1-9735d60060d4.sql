-- Atualizar trigger para contar apenas planos ATIVOS (permite manter histórico)
CREATE OR REPLACE FUNCTION public.enforce_workout_plan_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_active_plan_count INTEGER;
  v_is_premium BOOLEAN;
BEGIN
  -- Check user's subscription status from the subscriptions table
  SELECT (plan_type = 'premium' AND status = 'active')
  INTO v_is_premium
  FROM public.subscriptions
  WHERE user_id = NEW.user_id;
  
  -- If premium or no subscription record found (default to allowing), return
  IF v_is_premium IS TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Count only ACTIVE plans for free users (allows keeping history)
  SELECT COUNT(*)
  INTO v_active_plan_count
  FROM public.workout_plans
  WHERE user_id = NEW.user_id
    AND is_active = true;
  
  -- Enforce 1 ACTIVE plan limit for free users
  IF v_active_plan_count >= 1 THEN
    RAISE EXCEPTION 'Free users are limited to 1 active workout plan. Upgrade to Premium for unlimited plans.';
  END IF;
  
  RETURN NEW;
END;
$function$;