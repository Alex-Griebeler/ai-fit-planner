CREATE TABLE IF NOT EXISTS public.par_q_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  version integer NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  any_yes boolean NOT NULL DEFAULT false,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_par_q_responses_user_submitted
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
