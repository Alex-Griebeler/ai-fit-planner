-- Add split_preference column to user_onboarding_data table
-- This stores the user's preferred split for 3x/week training (intermediate/advanced only)
ALTER TABLE public.user_onboarding_data 
ADD COLUMN IF NOT EXISTS split_preference TEXT CHECK (split_preference IN ('fullbody', 'push_pull_legs', 'hybrid'));