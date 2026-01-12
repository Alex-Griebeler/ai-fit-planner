-- Create rate limiting table with pre-computed window hour
CREATE TABLE public.rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_hour TEXT NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_endpoint_window UNIQUE (user_id, endpoint, window_hour)
);

-- Create index for faster lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (user_id, endpoint, window_hour);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own rate limit data
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Service role bypasses RLS, so no special policy needed for edge functions

-- Create function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 5,
    p_window_hours INTEGER DEFAULT 1
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMP WITH TIME ZONE, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_hour TEXT;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_current_count INTEGER;
    v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate current window (truncated to hour as text for unique constraint)
    v_window_start := date_trunc('hour', now());
    v_window_hour := to_char(v_window_start, 'YYYY-MM-DD-HH24');
    v_reset_at := v_window_start + (p_window_hours || ' hours')::INTERVAL;
    
    -- Try to insert or update the rate limit record
    INSERT INTO public.rate_limits (user_id, endpoint, window_hour, request_count, window_start)
    VALUES (p_user_id, p_endpoint, v_window_hour, 1, v_window_start)
    ON CONFLICT (user_id, endpoint, window_hour)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING rate_limits.request_count INTO v_current_count;
    
    RETURN QUERY SELECT 
        v_current_count <= p_max_requests AS allowed,
        v_current_count AS current_count,
        v_reset_at AS reset_at,
        GREATEST(0, p_max_requests - v_current_count) AS remaining;
END;
$$;

-- Cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < now() - INTERVAL '24 hours';
END;
$$;