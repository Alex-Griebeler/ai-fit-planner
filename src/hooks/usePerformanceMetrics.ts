import { useMemo } from 'react';
import { subDays } from 'date-fns';
import type { WorkoutSession } from './useWorkoutSessions';

export interface PerformanceMetrics {
  workoutsThisWeek: number;
  weeklyGoal: number;
  completionRate: number;
  avgRpe: string | null;
  totalMinutes: number;
  rpeTrend: 'positive' | 'neutral' | 'negative';
  completionTrend: 'positive' | 'neutral' | 'negative';
}

export function usePerformanceMetrics(
  sessions: WorkoutSession[], 
  weeklyGoal: number
): PerformanceMetrics {
  return useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const thisWeekSessions = sessions.filter(s => 
      s.status === 'completed' && 
      s.completed_at &&
      new Date(s.completed_at) > sevenDaysAgo
    );
    
    // Treinos esta semana
    const workoutsThisWeek = thisWeekSessions.length;
    
    // Taxa de conclusao (completed_sets / total_sets)
    const completionRate = thisWeekSessions.length > 0
      ? thisWeekSessions.reduce((acc, s) => {
          if (s.total_sets === 0) return acc;
          return acc + (s.completed_sets / s.total_sets);
        }, 0) / thisWeekSessions.length * 100
      : 0;
    
    // RPE medio
    const sessionsWithRpe = thisWeekSessions.filter(s => s.perceived_effort != null);
    const avgRpeValue = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((acc, s) => acc + (s.perceived_effort ?? 0), 0) / sessionsWithRpe.length
      : null;
    
    // Tempo ativo total
    const totalMinutes = thisWeekSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    
    // Determine RPE trend (6-8 is ideal zone)
    let rpeTrend: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (avgRpeValue !== null) {
      if (avgRpeValue >= 6 && avgRpeValue <= 8) {
        rpeTrend = 'positive';
      } else if (avgRpeValue < 5 || avgRpeValue > 9) {
        rpeTrend = 'negative';
      }
    }
    
    // Determine completion trend
    let completionTrend: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (completionRate >= 80) {
      completionTrend = 'positive';
    } else if (completionRate < 60) {
      completionTrend = 'negative';
    }
    
    return {
      workoutsThisWeek,
      weeklyGoal,
      completionRate: Math.round(completionRate),
      avgRpe: avgRpeValue !== null ? avgRpeValue.toFixed(1) : null,
      totalMinutes,
      rpeTrend,
      completionTrend,
    };
  }, [sessions, weeklyGoal]);
}

// Helper to format minutes as "Xh Ymin" or "X min"
export function formatActiveTime(minutes: number): string {
  if (minutes === 0) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
