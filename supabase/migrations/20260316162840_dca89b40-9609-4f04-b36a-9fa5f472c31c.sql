
CREATE OR REPLACE FUNCTION public.replace_active_plan(
  p_plan_name text,
  p_description text DEFAULT NULL,
  p_weekly_frequency integer DEFAULT 3,
  p_session_duration text DEFAULT '60min',
  p_periodization text DEFAULT NULL,
  p_plan_data jsonb DEFAULT '{}'::jsonb,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_new_plan record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Deactivate all current active plans (preserves history)
  UPDATE workout_plans
  SET is_active = false
  WHERE user_id = v_user_id AND is_active = true;

  -- Insert new active plan
  INSERT INTO workout_plans (
    user_id, plan_name, description, weekly_frequency,
    session_duration, periodization, plan_data, is_active, expires_at
  )
  VALUES (
    v_user_id, p_plan_name, p_description, p_weekly_frequency,
    p_session_duration, p_periodization, p_plan_data, true, p_expires_at
  )
  RETURNING * INTO v_new_plan;

  -- Return the created plan as JSON
  RETURN jsonb_build_object(
    'id', v_new_plan.id,
    'user_id', v_new_plan.user_id,
    'plan_name', v_new_plan.plan_name,
    'description', v_new_plan.description,
    'weekly_frequency', v_new_plan.weekly_frequency,
    'session_duration', v_new_plan.session_duration,
    'periodization', v_new_plan.periodization,
    'plan_data', v_new_plan.plan_data,
    'is_active', v_new_plan.is_active,
    'created_at', v_new_plan.created_at,
    'expires_at', v_new_plan.expires_at
  );
END;
$$;
