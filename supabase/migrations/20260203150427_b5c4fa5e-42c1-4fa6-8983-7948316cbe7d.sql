-- Update trigger function to create new users as premium
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.user_id, 'premium', 'active');
  RETURN NEW;
END;
$function$;

-- Update all existing subscriptions to premium
UPDATE public.subscriptions 
SET plan_type = 'premium', status = 'active', updated_at = now()
WHERE plan_type = 'free' OR status != 'active';