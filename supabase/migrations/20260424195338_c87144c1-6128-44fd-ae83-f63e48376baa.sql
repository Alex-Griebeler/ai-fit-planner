-- Ensure multi-goal onboarding support exists in environments where the
-- previous goals migration was not applied or the schema cache drifted.
-- Safe to run multiple times.

ALTER TABLE public.user_onboarding_data
  ADD COLUMN IF NOT EXISTS goals text[] DEFAULT '{}'::text[];

-- Backfill legacy single-goal records without overwriting existing multi-goal data.
UPDATE public.user_onboarding_data
SET goals = ARRAY[goal]
WHERE (goals IS NULL OR cardinality(goals) = 0)
  AND goal IN ('weight_loss', 'hypertrophy', 'health', 'performance');

COMMENT ON COLUMN public.user_onboarding_data.goals IS
  'Objetivos combinados do usuário. Mantém compatibilidade com goal como objetivo primário.';