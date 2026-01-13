import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_plan_id: string | null;
  workout_day: string;
  workout_name: string;
  total_sets: number;
  completed_sets: number;
  exercises_data: Json;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
}

interface StartSessionParams {
  workoutPlanId: string;
  workoutDay: string;
  workoutName: string;
  totalSets: number;
  exercisesData?: Json;
}

interface UpdateSessionParams {
  completedSets?: number;
  exercisesData?: Json;
}

export function useWorkoutSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all sessions (last 30 days)
  const sessionsQuery = useQuery({
    queryKey: ['workout-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutSession[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch current in-progress session
  const currentSessionQuery = useQuery({
    queryKey: ['workout-sessions', user?.id, 'current'],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as WorkoutSession | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  // Start a new session
  const startMutation = useMutation({
    mutationFn: async (params: StartSessionParams): Promise<string> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Abandon any existing in-progress sessions
      await supabase
        .from('workout_sessions')
        .update({ status: 'abandoned' })
        .eq('user_id', user.id)
        .eq('status', 'in_progress');

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          workout_plan_id: params.workoutPlanId,
          workout_day: params.workoutDay,
          workout_name: params.workoutName,
          total_sets: params.totalSets,
          completed_sets: 0,
          exercises_data: params.exercisesData ?? [],
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
    },
  });

  // Update session progress
  const updateMutation = useMutation({
    mutationFn: async ({ 
      sessionId, 
      data: updateData 
    }: { 
      sessionId: string; 
      data: UpdateSessionParams 
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          completed_sets: updateData.completedSets,
          exercises_data: updateData.exercisesData,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id, 'current'] });
    },
  });

  // Complete session
  const completeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get session to calculate duration
      const { data: session } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      const startedAt = session?.started_at ? new Date(session.started_at) : new Date();
      const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
    },
  });

  // Abandon session
  const abandonMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get session to calculate duration
      const { data: session } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      const startedAt = session?.started_at ? new Date(session.started_at) : new Date();
      const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    currentSession: currentSessionQuery.data,
    isLoading: sessionsQuery.isLoading,
    startSession: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    updateSession: (sessionId: string, data: UpdateSessionParams) => 
      updateMutation.mutateAsync({ sessionId, data }),
    completeSession: completeMutation.mutateAsync,
    abandonSession: abandonMutation.mutateAsync,
  };
}
