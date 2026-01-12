-- Add DELETE policy that denies all user deletions on rate_limits table
-- This ensures only the SECURITY DEFINER cleanup function (running with service role) can delete records
CREATE POLICY "Prevent user deletion of rate limits"
ON public.rate_limits
FOR DELETE
USING (false);