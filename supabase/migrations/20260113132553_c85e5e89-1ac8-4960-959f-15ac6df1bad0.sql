-- Update CHECK constraint to include 'no_preference' option
ALTER TABLE public.user_onboarding_data 
DROP CONSTRAINT IF EXISTS user_onboarding_data_split_preference_check;

ALTER TABLE public.user_onboarding_data 
ADD CONSTRAINT user_onboarding_data_split_preference_check 
CHECK (split_preference IN ('fullbody', 'push_pull_legs', 'hybrid', 'no_preference'));