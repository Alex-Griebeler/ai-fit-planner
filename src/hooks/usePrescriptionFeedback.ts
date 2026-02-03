import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ExerciseFeedback {
  exerciseName: string;
  workoutDay: string;
  prescribedSets: number;
  completedSets: number;
  prescribedReps?: string;
  loadUsed?: string;
  exerciseRpe?: number;
  difficultyRating?: 'too_easy' | 'just_right' | 'too_hard';
  notes?: string;
}

interface SaveFeedbackParams {
  workoutPlanId: string;
  workoutSessionId: string;
  exercises: ExerciseFeedback[];
}

export function usePrescriptionFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveFeedbackMutation = useMutation({
    mutationFn: async (params: SaveFeedbackParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const feedbackRecords = params.exercises.map(exercise => ({
        user_id: user.id,
        workout_plan_id: params.workoutPlanId,
        workout_session_id: params.workoutSessionId,
        exercise_name: exercise.exerciseName,
        workout_day: exercise.workoutDay,
        prescribed_sets: exercise.prescribedSets,
        completed_sets: exercise.completedSets,
        prescribed_reps: exercise.prescribedReps || null,
        load_used: exercise.loadUsed || null,
        exercise_rpe: exercise.exerciseRpe || null,
        difficulty_rating: exercise.difficultyRating || null,
        notes: exercise.notes || null,
      }));

      const { error } = await supabase
        .from('prescription_feedback')
        .insert(feedbackRecords);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-feedback'] });
    },
  });

  return {
    saveFeedback: saveFeedbackMutation.mutateAsync,
    isSaving: saveFeedbackMutation.isPending,
  };
}
