-- Tabela para logging do Learning Context V2
-- Permite análise e debug das decisões de ajuste dinâmico

CREATE TABLE public.learning_context_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  
  -- Métricas calculadas
  sessions_analyzed INTEGER NOT NULL DEFAULT 0,
  avg_rpe NUMERIC(3, 1),
  rpe_std_dev NUMERIC(3, 2),
  completion_rate NUMERIC(5, 2),
  avg_session_duration INTEGER,
  actual_frequency NUMERIC(3, 1),
  planned_frequency INTEGER,
  
  -- Ajustes recomendados (v2 - logging only)
  volume_multiplier NUMERIC(3, 2) DEFAULT 1.00,
  intensity_shift TEXT DEFAULT 'maintain' CHECK (intensity_shift IN ('maintain', 'increase', 'decrease')),
  deload_recommended BOOLEAN DEFAULT FALSE,
  confidence_score NUMERIC(3, 2) DEFAULT 0.00,
  
  -- Flags de guardrails
  adjustments_applied BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  cooldown_active BOOLEAN DEFAULT FALSE,
  
  -- Contexto completo para debug
  raw_context JSONB,
  prompt_context TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_context_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own learning logs"
  ON public.learning_context_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (from Edge Function)
-- Note: Edge functions use service role key, so no INSERT policy needed for users

-- Index for fast queries
CREATE INDEX idx_learning_context_logs_user_id ON public.learning_context_logs(user_id);
CREATE INDEX idx_learning_context_logs_created_at ON public.learning_context_logs(created_at DESC);

-- Comment for documentation
COMMENT ON TABLE public.learning_context_logs IS 'Logs de decisões do Learning Context V2 para análise e debug de ajustes dinâmicos de volume';