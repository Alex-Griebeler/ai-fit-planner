ALTER TABLE public.user_onboarding_data
ADD COLUMN IF NOT EXISTS injury_details jsonb NOT NULL DEFAULT '{}'::jsonb;