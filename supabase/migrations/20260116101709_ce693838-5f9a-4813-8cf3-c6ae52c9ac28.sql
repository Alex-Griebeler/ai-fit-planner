-- Create a function to enforce workout plan limits for free users
CREATE OR REPLACE FUNCTION public.enforce_workout_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_count INTEGER;
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
  
  -- Count existing plans for free users
  SELECT COUNT(*)
  INTO v_plan_count
  FROM public.workout_plans
  WHERE user_id = NEW.user_id;
  
  -- Enforce 1-plan limit for free users
  IF v_plan_count >= 1 THEN
    RAISE EXCEPTION 'Free users are limited to 1 workout plan. Upgrade to Premium for unlimited plans.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce plan limit before INSERT
CREATE TRIGGER enforce_plan_limit_trigger
  BEFORE INSERT ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workout_plan_limit();