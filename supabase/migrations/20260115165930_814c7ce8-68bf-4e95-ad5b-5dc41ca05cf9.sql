-- Create prescription_feedback table for detailed per-exercise feedback
CREATE TABLE public.prescription_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  workout_day TEXT NOT NULL,
  
  -- Prescription vs Reality
  prescribed_sets INTEGER NOT NULL,
  completed_sets INTEGER NOT NULL DEFAULT 0,
  prescribed_reps TEXT,
  
  -- Load tracking
  load_used TEXT,
  
  -- Granular feedback
  exercise_rpe INTEGER CHECK (exercise_rpe >= 1 AND exercise_rpe <= 10),
  difficulty_rating TEXT CHECK (difficulty_rating IN ('too_easy', 'adequate', 'too_hard')),
  
  -- Optional notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_prescription_feedback_user_id ON public.prescription_feedback(user_id);
CREATE INDEX idx_prescription_feedback_exercise_name ON public.prescription_feedback(exercise_name);
CREATE INDEX idx_prescription_feedback_created_at ON public.prescription_feedback(created_at DESC);
CREATE INDEX idx_prescription_feedback_session ON public.prescription_feedback(workout_session_id);

-- Enable RLS
ALTER TABLE public.prescription_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own exercise feedback"
ON public.prescription_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise feedback"
ON public.prescription_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise feedback"
ON public.prescription_feedback
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise feedback"
ON public.prescription_feedback
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_prescription_feedback_updated_at
BEFORE UPDATE ON public.prescription_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();