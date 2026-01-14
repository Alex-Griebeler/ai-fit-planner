-- Add cardio_timing column for user preference on when to do cardio
ALTER TABLE public.user_onboarding_data 
ADD COLUMN IF NOT EXISTS cardio_timing TEXT DEFAULT NULL;

COMMENT ON COLUMN public.user_onboarding_data.cardio_timing IS 
  'Preferência de timing para cardio: post_workout, separate_day, ai_decides';