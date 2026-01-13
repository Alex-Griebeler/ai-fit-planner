import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface ExerciseLoad {
  workout_day: string;
  exercise_name: string;
  load_value: string;
}

interface UseExerciseLoadsReturn {
  loads: Record<string, string>; // key: "workoutDay|exerciseName", value: load
  saveLoad: (workoutDay: string, exerciseName: string, loadValue: string) => Promise<void>;
  isLoading: boolean;
}

export function useExerciseLoads(workoutPlanId: string | null): UseExerciseLoadsReturn {
  const { user } = useAuth();
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const getLoadKey = (workoutDay: string, exerciseName: string): string => {
    return `${workoutDay}|${exerciseName}`;
  };

  // Fetch existing loads when plan changes
  useEffect(() => {
    if (!workoutPlanId || !user) {
      setLoads({});
      return;
    }

    const fetchLoads = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('exercise_loads')
          .select('workout_day, exercise_name, load_value')
          .eq('workout_plan_id', workoutPlanId)
          .eq('user_id', user.id);

        if (error) throw error;

        const loadMap: Record<string, string> = {};
        data?.forEach((load: ExerciseLoad) => {
          const key = getLoadKey(load.workout_day, load.exercise_name);
          loadMap[key] = load.load_value;
        });
        setLoads(loadMap);
      } catch (err) {
        console.error('Error fetching exercise loads:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoads();
  }, [workoutPlanId, user]);

  const saveLoad = useCallback(async (
    workoutDay: string,
    exerciseName: string,
    loadValue: string
  ) => {
    if (!workoutPlanId || !user) return;

    const key = getLoadKey(workoutDay, exerciseName);
    
    // Update local state immediately
    setLoads(prev => ({
      ...prev,
      [key]: loadValue
    }));

    try {
      // Upsert the load value
      const { error } = await supabase
        .from('exercise_loads')
        .upsert({
          user_id: user.id,
          workout_plan_id: workoutPlanId,
          workout_day: workoutDay,
          exercise_name: exerciseName,
          load_value: loadValue,
        }, {
          onConflict: 'user_id,workout_plan_id,workout_day,exercise_name'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving exercise load:', err);
      toast.error('Erro ao salvar carga');
      // Revert local state on error
      setLoads(prev => {
        const newLoads = { ...prev };
        delete newLoads[key];
        return newLoads;
      });
    }
  }, [workoutPlanId, user]);

  return { loads, saveLoad, isLoading };
}
