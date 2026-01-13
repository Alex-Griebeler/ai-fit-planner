-- Add injury_areas column to user_onboarding_data table
ALTER TABLE user_onboarding_data 
ADD COLUMN injury_areas text[] DEFAULT '{}'::text[];