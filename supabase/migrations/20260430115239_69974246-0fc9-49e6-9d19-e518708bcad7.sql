
-- 1. Tabela de configuração singleton
CREATE TABLE IF NOT EXISTS public.beta_premium_config (
  id INT PRIMARY KEY DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_slots INT NOT NULL DEFAULT 30,
  slots_used INT NOT NULL DEFAULT 0,
  default_duration_days INT NOT NULL DEFAULT 30,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE public.beta_premium_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view beta config"
  ON public.beta_premium_config FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update beta config"
  ON public.beta_premium_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert beta config"
  ON public.beta_premium_config FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Inicializa singleton já ativo
INSERT INTO public.beta_premium_config (id, is_active, max_slots, slots_used, default_duration_days, started_at)
VALUES (1, true, 30, 0, 30, now())
ON CONFLICT (id) DO NOTHING;

-- 2. Coluna is_beta_grant em subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_beta_grant BOOLEAN NOT NULL DEFAULT false;

-- 3. Atualiza trigger handle_new_user_subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_grant_premium BOOLEAN := false;
  v_period_end TIMESTAMPTZ := NULL;
BEGIN
  -- Lock row to prevent race conditions on concurrent signups
  SELECT * INTO v_config
  FROM public.beta_premium_config
  WHERE id = 1
  FOR UPDATE;

  IF FOUND
     AND v_config.is_active
     AND v_config.slots_used < v_config.max_slots THEN
    v_grant_premium := true;
    v_period_end := now() + (v_config.default_duration_days || ' days')::interval;
  END IF;

  IF v_grant_premium THEN
    INSERT INTO public.subscriptions (
      user_id, plan_type, status, is_beta_grant,
      current_period_start, current_period_end
    )
    VALUES (
      NEW.user_id, 'premium', 'active', true,
      now(), v_period_end
    );

    UPDATE public.beta_premium_config
       SET slots_used = slots_used + 1,
           is_active = CASE WHEN slots_used + 1 >= max_slots THEN false ELSE is_active END,
           ended_at  = CASE WHEN slots_used + 1 >= max_slots THEN now() ELSE ended_at END,
           updated_at = now()
     WHERE id = 1;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan_type, status)
    VALUES (NEW.user_id, 'free', 'active');
  END IF;

  RETURN NEW;
END;
$function$;
