-- Persist multi-goal onboarding selections while keeping legacy compatibility.
ALTER TABLE public.user_onboarding_data
  ADD COLUMN IF NOT EXISTS goals text[] DEFAULT '{}'::text[];

-- Backfill from legacy single goal for existing records with empty goals.
UPDATE public.user_onboarding_data
SET goals = ARRAY[goal]
WHERE (goals IS NULL OR cardinality(goals) = 0)
  AND goal IN ('weight_loss', 'hypertrophy', 'health', 'performance');

COMMENT ON COLUMN public.user_onboarding_data.goals IS
  'Objetivos combinados (multi-select). Valores válidos: weight_loss, hypertrophy, health, performance.';

COMMENT ON COLUMN public.user_onboarding_data.cardio_timing IS
  'Preferência de timing para cardio: pre_workout, post_workout, separate_day, ai_decides';
