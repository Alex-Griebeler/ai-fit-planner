-- Make PAR-Q RLS policies idempotent so re-running setup does not error.
DROP POLICY IF EXISTS "Users can read their own par_q responses" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can insert their own par_q responses" ON public.par_q_responses;

CREATE POLICY "Users can read their own par_q responses"
ON public.par_q_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own par_q responses"
ON public.par_q_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);