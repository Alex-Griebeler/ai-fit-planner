-- Add defense-in-depth INSERT policy to deny direct user inserts
-- Service role operations (edge functions) bypass RLS entirely
CREATE POLICY "System-only notification creation"
ON public.notifications
FOR INSERT
WITH CHECK (false);