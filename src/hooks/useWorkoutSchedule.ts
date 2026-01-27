import { useMemo } from 'react';
import { useWorkoutPlans } from './useWorkoutPlans';
import { useOnboardingData } from './useOnboardingData';
import { useWorkoutSessions } from './useWorkoutSessions';
import { 
  getWeeklySchedule, 
  reorderWorkoutsWithSuggestion,
} from '@/lib/workoutScheduler';

interface Workout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration?: string;
  exercises: Array<{
    order?: number;
    name: string;
    equipment?: string;
    sets: number;
    reps: string;
    rest?: string;
    intensity?: string;
    tempo?: string;
    notes?: string;
    isCompound?: boolean;
    method?: string;
  }>;
}

interface PlanData {
  workouts?: Workout[];
}

export interface WorkoutScheduleResult {
  /** Índice do treino sugerido (para destacar na UI) */
  suggestedWorkoutIndex: number | null;
  /** Índice do treino de hoje */
  todayWorkoutIndex: number | null;
  /** Índice do treino pendente (dia anterior não completado) */
  pendingWorkoutIndex: number | null;
  /** Índices dos treinos completados na semana */
  completedIndices: number[];
  /** Se a semana de treinos está completa */
  isWeekComplete: boolean;
  /** Se hoje é dia de descanso */
  isRestDay: boolean;
  /** Motivo da sugestão para exibir ao usuário */
  reason: string;
  /** Ordem recomendada dos índices de treino */
  reorderedIndices: number[];
  /** Dias de treino do onboarding */
  trainingDays: string[];
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook que calcula o cronograma semanal e sugere o próximo treino
 * 
 * Combina dados de:
 * - useWorkoutPlans (treinos do plano ativo)
 * - useOnboardingData (dias selecionados)
 * - useWorkoutSessions (sessões da semana)
 */
export function useWorkoutSchedule(): WorkoutScheduleResult {
  const { activePlan, isLoading: isLoadingPlans } = useWorkoutPlans();
  const { onboardingData, isLoading: isLoadingOnboarding } = useOnboardingData();
  const { sessions, isLoading: isLoadingSessions } = useWorkoutSessions();
  
  const isLoading = isLoadingPlans || isLoadingOnboarding || isLoadingSessions;
  
  const scheduleResult = useMemo(() => {
    // Default result when no plan is active
    const defaultResult: Omit<WorkoutScheduleResult, 'isLoading'> = {
      suggestedWorkoutIndex: null,
      todayWorkoutIndex: null,
      pendingWorkoutIndex: null,
      completedIndices: [],
      isWeekComplete: false,
      isRestDay: false,
      reason: '',
      reorderedIndices: [],
      trainingDays: [],
    };
    
    if (!activePlan) {
      return defaultResult;
    }
    
    const planData = activePlan.plan_data as PlanData;
    const workouts = planData?.workouts ?? [];
    const totalWorkouts = workouts.length;
    
    if (totalWorkouts === 0) {
      return defaultResult;
    }
    
    // Obter dias de treino do onboarding
    const trainingDays = onboardingData?.trainingDays ?? [];
    
    // Se não tiver dias configurados, usar ordem original
    if (trainingDays.length === 0) {
      const indices = workouts.map((_, i) => i);
      return {
        ...defaultResult,
        reorderedIndices: indices,
        trainingDays: [],
        reason: 'Dias de treino não configurados.',
      };
    }
    
    // Calcular cronograma
    const schedule = getWeeklySchedule(totalWorkouts, trainingDays, sessions);
    
    // Criar lista de índices originais
    const originalIndices = workouts.map((_, i) => i);
    
    // Reordenar com treino sugerido no topo
    const reorderedIndices = reorderWorkoutsWithSuggestion(
      originalIndices,
      schedule.suggestedWorkoutIndex
    );
    
    return {
      suggestedWorkoutIndex: schedule.suggestedWorkoutIndex,
      todayWorkoutIndex: schedule.todayWorkoutIndex,
      pendingWorkoutIndex: schedule.pendingWorkoutIndex,
      completedIndices: schedule.completedIndices,
      isWeekComplete: schedule.isWeekComplete,
      isRestDay: schedule.isRestDay,
      reason: schedule.reason,
      reorderedIndices,
      trainingDays,
    };
  }, [activePlan, onboardingData, sessions]);
  
  return {
    ...scheduleResult,
    isLoading,
  };
}
