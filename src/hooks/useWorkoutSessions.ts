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
  perceived_effort: number | null;
  session_notes: string | null;
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

interface SessionIdentity {
  id: string;
  workout_plan_id: string | null;
  workout_day: string;
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
        .limit(1)
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

      // Check if a session was completed recently (last 30 seconds) to prevent duplicates
      const recentlyCompleted = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 30000).toISOString())
        .limit(1)
        .maybeSingle();

      if (recentlyCompleted.error) {
        throw recentlyCompleted.error;
      }

      if (recentlyCompleted.data) {
        throw new Error('Session recently completed - preventing duplicate');
      }

      // Abandon any existing in-progress sessions
      const { error: abandonError } = await supabase
        .from('workout_sessions')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'in_progress');

      if (abandonError) {
        throw new Error(`Failed to abandon previous sessions: ${abandonError.message}`);
      }

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
        .select('id, workout_plan_id, workout_day')
        .single();

      if (error) {
        // If another request created an in-progress session first, reuse it.
        if (error.code === '23505') {
          const { data: existingSession, error: existingError } = await supabase
            .from('workout_sessions')
            .select('id, workout_plan_id, workout_day')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingError) throw existingError;
          if (existingSession?.id) {
            const sameWorkout =
              existingSession.workout_plan_id === params.workoutPlanId &&
              existingSession.workout_day === params.workoutDay;

            if (sameWorkout) {
              return existingSession.id;
            }

            // Best effort retry: abandon conflicting session and try one more insert.
            await supabase
              .from('workout_sessions')
              .update({
                status: 'abandoned',
                completed_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .eq('status', 'in_progress');

            const { data: retryData, error: retryError } = await supabase
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

            if (!retryError && retryData?.id) {
              return retryData.id;
            }

            throw new Error('Unable to start session due to concurrent session conflict');
          }
        }

        throw error;
      }
      const sessionIdentity = data as SessionIdentity;
      return sessionIdentity.id;
    },
    onSuccess: (sessionId, params) => {
      // Immediately set the current session in cache for fast UI response
      const newSession: WorkoutSession = {
        id: sessionId,
        user_id: user!.id,
        workout_plan_id: params.workoutPlanId,
        workout_day: params.workoutDay,
        workout_name: params.workoutName,
        total_sets: params.totalSets,
        completed_sets: 0,
        exercises_data: params.exercisesData ?? [],
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_minutes: null,
        perceived_effort: null,
        session_notes: null,
        status: 'in_progress',
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(['workout-sessions', user?.id, 'current'], newSession);
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
      // Immediately clear current session from cache to prevent race conditions
      queryClient.setQueryData(['workout-sessions', user?.id, 'current'], null);
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
      queryClient.setQueryData(['workout-sessions', user?.id, 'current'], null);
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id, 'current'] });
    },
  });

  // Delete session
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('workout_sessions')
        .delete()
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
    isCurrentSessionLoading: currentSessionQuery.isLoading,
    isLoading: sessionsQuery.isLoading,
    startSession: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    updateSession: (sessionId: string, data: UpdateSessionParams) => 
      updateMutation.mutateAsync({ sessionId, data }),
    completeSession: completeMutation.mutateAsync,
    abandonSession: abandonMutation.mutateAsync,
    deleteSession: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
