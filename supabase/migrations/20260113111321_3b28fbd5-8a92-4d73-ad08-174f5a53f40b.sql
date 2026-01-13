-- Drop existing handle_new_user function and recreate with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_name TEXT;
BEGIN
    -- Validate and sanitize the name from user metadata
    -- 1. Get the name from metadata with fallback to email, then default
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        'Usuário'
    );
    
    -- 2. Sanitize the name: limit length and remove potentially dangerous characters
    -- Remove any control characters, limit to 100 chars
    v_name := LEFT(
        regexp_replace(v_name, '[[:cntrl:]]', '', 'g'),
        100
    );
    
    -- 3. Ensure name is not empty after sanitization
    IF v_name IS NULL OR LENGTH(TRIM(v_name)) = 0 THEN
        v_name := 'Usuário';
    END IF;
    
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, v_name);
    
    RETURN NEW;
END;
$function$;