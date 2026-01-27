import { useMemo, useCallback } from 'react';
import { useWorkoutPlans } from './useWorkoutPlans';
import { useOnboardingData } from './useOnboardingData';
import { useWorkoutSessions } from './useWorkoutSessions';
import { 
  getWeeklySchedule, 
  skipWorkout as skipWorkoutUtil,
  type Workout,
  type ScheduledWorkout,
  type WorkoutScheduleResult
} from '@/lib/workoutScheduler';
import type { Json } from '@/integrations/supabase/types';

interface PlanData {
  workouts?: Workout[];
}

export interface UseWorkoutScheduleReturn extends WorkoutScheduleResult {
  isLoading: boolean;
  hasActivePlan: boolean;
  planId: string | null;
  skipWorkout: (workoutDayName: string) => void;
  refetch: () => Promise<void>;
}

export function useWorkoutSchedule(): UseWorkoutScheduleReturn {
  const { activePlan, isLoading: plansLoading, refetchPlans } = useWorkoutPlans();
  const { onboardingData, isLoading: onboardingLoading } = useOnboardingData();
  const { sessions, isLoading: sessionsLoading } = useWorkoutSessions();

  const isLoading = plansLoading || onboardingLoading || sessionsLoading;
  const hasActivePlan = !!activePlan;

  const scheduleResult = useMemo<WorkoutScheduleResult>(() => {
    // Default empty result
    const emptyResult: WorkoutScheduleResult = {
      todayWorkout: null,
      missedWorkout: null,
      nextWorkout: null,
      isWeekComplete: false,
      isRestDay: false,
      completedCount: 0,
      totalWorkouts: 0,
    };

    if (!activePlan) return emptyResult;

    // Get workouts from plan
    const planData = activePlan.plan_data as PlanData;
    const workouts = planData?.workouts ?? [];
    
    if (workouts.length === 0) return emptyResult;

    // Get training days from onboarding or fallback to plan frequency
    let trainingDays: string[] = [];
    
    if (onboardingData?.trainingDays && onboardingData.trainingDays.length > 0) {
      trainingDays = onboardingData.trainingDays;
    } else {
      // Fallback: generate default days based on weekly frequency
      const defaultDays = ['mon', 'wed', 'fri', 'tue', 'thu', 'sat', 'sun'];
      trainingDays = defaultDays.slice(0, activePlan.weekly_frequency);
    }

    // Filter sessions for the active plan
    const planSessions = sessions.filter(
      session => session.workout_plan_id === activePlan.id
    );

    return getWeeklySchedule(workouts, trainingDays, planSessions);
  }, [activePlan, onboardingData, sessions]);

  const skipWorkout = useCallback((workoutDayName: string) => {
    skipWorkoutUtil(workoutDayName);
    // Force re-render by refetching
    refetchPlans();
  }, [refetchPlans]);

  const refetch = useCallback(async () => {
    await refetchPlans();
  }, [refetchPlans]);

  return {
    ...scheduleResult,
    isLoading,
    hasActivePlan,
    planId: activePlan?.id ?? null,
    skipWorkout,
    refetch,
  };
}

export type { ScheduledWorkout, Workout };
