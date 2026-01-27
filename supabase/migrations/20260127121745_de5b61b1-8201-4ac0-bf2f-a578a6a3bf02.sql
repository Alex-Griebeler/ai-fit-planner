-- Temporarily disable the workout plan limit trigger for testing
DROP TRIGGER IF EXISTS enforce_workout_plan_limit_trigger ON public.workout_plans;