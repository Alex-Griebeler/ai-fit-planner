import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  streak_freezes: number;
  created_at: string;
  updated_at: string;
}

export function useStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user streak
  const streakQuery = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no streak record exists, create one
      if (!data) {
        const { data: newStreak, error: insertError } = await supabase
          .from('user_streaks')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newStreak as UserStreak;
      }

      return data as UserStreak;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Update streak after workout completion
  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const currentStreak = streakQuery.data;

      if (!currentStreak) {
        // Create streak if doesn't exist
        const { data, error } = await supabase
          .from('user_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_workout_date: today,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserStreak;
      }

      const lastWorkoutDate = currentStreak.last_workout_date;
      let newCurrentStreak = currentStreak.current_streak;
      let newLongestStreak = currentStreak.longest_streak;

      if (!lastWorkoutDate) {
        // First workout
        newCurrentStreak = 1;
      } else if (lastWorkoutDate === today) {
        // Already worked out today, no change
        return currentStreak;
      } else {
        const lastDate = new Date(lastWorkoutDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          newCurrentStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newCurrentStreak = 1;
        }
      }

      // Update longest streak if needed
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      const { data, error } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_workout_date: today,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserStreak;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-streak', user?.id], data);
    },
  });

  // Calculate if streak is at risk (last workout was yesterday)
  // Normalized to UTC to avoid timezone issues
  const isStreakAtRisk = () => {
    if (!streakQuery.data?.last_workout_date) return false;
    
    // Normalize dates to YYYY-MM-DD format for comparison
    const lastDateStr = streakQuery.data.last_workout_date.split('T')[0];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    return lastDateStr === yesterdayStr;
  };

  // Calculate days since last workout
  const getDaysSinceLastWorkout = (): number | null => {
    if (!streakQuery.data?.last_workout_date) return null;
    
    const lastDate = new Date(streakQuery.data.last_workout_date);
    const today = new Date();
    return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  return {
    streak: streakQuery.data,
    isLoading: streakQuery.isLoading,
    updateStreak: updateStreakMutation.mutateAsync,
    isUpdating: updateStreakMutation.isPending,
    isStreakAtRisk: isStreakAtRisk(),
    daysSinceLastWorkout: getDaysSinceLastWorkout(),
  };
}
