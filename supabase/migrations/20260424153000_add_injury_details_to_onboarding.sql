-- Add structured injury details per body area to onboarding data.
--
-- Stored as JSONB keyed by InjuryArea (shoulder, lower_back, cervical,
-- knee, hip, ankle_foot). Each value may contain optional fields:
--   side:     'left' | 'right' | 'both'
--   severity: 'mild' | 'moderate' | 'severe'
--   duration: 'acute' | 'chronic'
--
-- All fields are optional; existing rows keep the default '{}'::jsonb.
-- Missing entries mean the user did not provide detail for that area.

ALTER TABLE public.user_onboarding_data
  ADD COLUMN IF NOT EXISTS injury_details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_onboarding_data.injury_details IS
  'Per-area injury metadata (side, severity, duration). Keyed by InjuryArea. All fields optional.';
