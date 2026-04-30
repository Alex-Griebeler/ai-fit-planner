-- 1) Beta Premium: garantir estado inicial seguro (inativo) caso nunca tenha sido iniciado
UPDATE public.beta_premium_config
   SET is_active = false,
       updated_at = now()
 WHERE id = 1
   AND started_at IS NULL;

-- 2) PAR-Q: tornar policies idempotentes
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
