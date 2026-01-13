import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

interface ChartDataPoint {
  date: string;
  [exerciseName: string]: string | number;
}

interface UseLoadProgressDataReturn {
  data: ChartDataPoint[];
  exerciseNames: string[];
  isLoading: boolean;
}

export function useLoadProgressData(): UseLoadProgressDataReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setData([]);
      setExerciseNames([]);
      setIsLoading(false);
      return;
    }

    const fetchLoadData = async () => {
      setIsLoading(true);
      try {
        const { data: loads, error } = await supabase
          .from('exercise_loads')
          .select('exercise_name, load_value, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!loads || loads.length === 0) {
          setData([]);
          setExerciseNames([]);
          setIsLoading(false);
          return;
        }

        // Extract unique exercise names
        const uniqueExercises = [...new Set(loads.map(l => l.exercise_name))];
        setExerciseNames(uniqueExercises);

        // Group by date (DD/MM format)
        const groupedByDate: Record<string, Record<string, number>> = {};

        loads.forEach(load => {
          const dateKey = format(new Date(load.created_at), 'dd/MM');
          
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {};
          }

          // Parse load value (could be "60kg" or "60")
          const numericValue = parseFloat(load.load_value.replace(/[^\\d.]/g, ''));
          
          if (!isNaN(numericValue)) {
            // Keep the highest value for each exercise on the same date
            const currentValue = groupedByDate[dateKey][load.exercise_name] || 0;
            groupedByDate[dateKey][load.exercise_name] = Math.max(currentValue, numericValue);
          }
        });

        // Convert to chart format
        const chartData: ChartDataPoint[] = Object.entries(groupedByDate).map(([date, exercises]) => ({
          date,
          ...exercises,
        }));

        setData(chartData);
      } catch (err) {
        console.error('Error fetching load progress data:', err);
        setData([]);
        setExerciseNames([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoadData();
  }, [user]);

  return { data, exerciseNames, isLoading };
}
