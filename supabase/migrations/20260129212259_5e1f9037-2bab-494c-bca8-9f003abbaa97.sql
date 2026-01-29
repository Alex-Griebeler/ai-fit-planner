-- Add INSERT policy for learning_context_logs
-- The system (via edge functions) needs to insert learning logs for users
CREATE POLICY "Users can insert their own learning logs"
ON public.learning_context_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for learning_context_logs
-- The system needs to update learning logs as workout patterns evolve
CREATE POLICY "Users can update their own learning logs"
ON public.learning_context_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for cleanup operations (optional but recommended)
CREATE POLICY "Users can delete their own learning logs"
ON public.learning_context_logs
FOR DELETE
USING (auth.uid() = user_id);