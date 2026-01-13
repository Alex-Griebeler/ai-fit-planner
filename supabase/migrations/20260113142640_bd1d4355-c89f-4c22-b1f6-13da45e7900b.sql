-- Create table for storing exercise loads
CREATE TABLE public.exercise_loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  workout_day TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  load_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workout_plan_id, workout_day, exercise_name)
);

-- Enable Row Level Security
ALTER TABLE public.exercise_loads ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own exercise loads"
ON public.exercise_loads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise loads"
ON public.exercise_loads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise loads"
ON public.exercise_loads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise loads"
ON public.exercise_loads
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercise_loads_updated_at
BEFORE UPDATE ON public.exercise_loads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_exercise_loads_user_plan ON public.exercise_loads(user_id, workout_plan_id);