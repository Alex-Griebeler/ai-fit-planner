-- Add user rating field to workout_plans table
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS user_rating integer CHECK (user_rating >= 1 AND user_rating <= 5);

-- Add rating_notes for optional feedback
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS rating_notes text;

-- Add rated_at timestamp
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS rated_at timestamp with time zone;

-- Comment for documentation
COMMENT ON COLUMN public.workout_plans.user_rating IS 'User rating from 1 to 5 stars when archiving the plan';
COMMENT ON COLUMN public.workout_plans.rating_notes IS 'Optional user notes about the plan experience';
COMMENT ON COLUMN public.workout_plans.rated_at IS 'When the user rated the plan';