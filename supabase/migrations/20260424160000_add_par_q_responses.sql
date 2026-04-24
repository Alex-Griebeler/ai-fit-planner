-- PAR-Q (Physical Activity Readiness Questionnaire) responses.
-- Users must answer every 90 days before using the app. If any answer is
-- "yes" the app blocks workouts until medical clearance.

CREATE TABLE IF NOT EXISTS public.par_q_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL,
  any_yes boolean NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_q_responses_user_submitted_at_idx
  ON public.par_q_responses (user_id, submitted_at DESC);

ALTER TABLE public.par_q_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own par_q responses" ON public.par_q_responses;
CREATE POLICY "Users can read their own par_q responses"
  ON public.par_q_responses
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own par_q responses" ON public.par_q_responses;
CREATE POLICY "Users can insert their own par_q responses"
  ON public.par_q_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.par_q_responses IS
  'PAR-Q screening responses per user. Required every 90 days before using the app.';
COMMENT ON COLUMN public.par_q_responses.answers IS
  'Object { q1: boolean, q2: boolean, ..., q7: boolean } for PAR-Q v1.';
COMMENT ON COLUMN public.par_q_responses.any_yes IS
  'True if any answer was "yes", meaning user must seek medical clearance.';
