import { useMemo } from 'react';
import { useWorkoutSessions } from './useWorkoutSessions';
import { useWorkoutPlans } from './useWorkoutPlans';
import { startOfWeek, endOfWeek, startOfMonth, isWithinInterval, subWeeks } from 'date-fns';

interface PerformanceStats {
  // This week
  weeklyCompleted: number;
  weeklyTarget: number;
  weeklyTrend: number; // compared to last week
  
  // Monthly minutes
  monthlyMinutes: number;
  monthlyMinutesTrend: number;
  
  // Completion rate
  completionRate: number;
  completionRateTrend: number;
  
  // Sessions info
  totalSessions: number;
  
  isLoading: boolean;
}

export function usePerformanceStats(): PerformanceStats {
  const { sessions, isLoading: sessionsLoading } = useWorkoutSessions();
  const { activePlan, isLoading: plansLoading } = useWorkoutPlans();
  
  const stats = useMemo(() => {
    const now = new Date();
    
    // This week's interval (Sunday to Saturday)
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    // Last week's interval
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    
    // This month's start
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subWeeks(now, 4));
    
    // Filter completed sessions
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.completed_at);
    
    // This week completed
    const thisWeekSessions = completedSessions.filter(s => 
      isWithinInterval(new Date(s.completed_at!), { start: thisWeekStart, end: thisWeekEnd })
    );
    
    // Last week completed
    const lastWeekSessions = completedSessions.filter(s => 
      isWithinInterval(new Date(s.completed_at!), { start: lastWeekStart, end: lastWeekEnd })
    );
    
    const weeklyCompleted = thisWeekSessions.length;
    const lastWeekCompleted = lastWeekSessions.length;
    const weeklyTrend = weeklyCompleted - lastWeekCompleted;
    
    // Monthly minutes
    const thisMonthSessions = completedSessions.filter(s => 
      new Date(s.completed_at!) >= thisMonthStart
    );
    
    const monthlyMinutes = thisMonthSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
    
    // Last 4 weeks for comparison (rough month)
    const last4WeeksSessions = completedSessions.filter(s => {
      const date = new Date(s.completed_at!);
      return date >= lastMonthStart && date < thisMonthStart;
    });
    
    const lastMonthMinutes = last4WeeksSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
    const monthlyMinutesTrend = monthlyMinutes - lastMonthMinutes;
    
    // Completion rate (this week: completed sets / total sets)
    const thisWeekTotalSets = thisWeekSessions.reduce((acc, s) => acc + s.total_sets, 0);
    const thisWeekCompletedSets = thisWeekSessions.reduce((acc, s) => acc + s.completed_sets, 0);
    const completionRate = thisWeekTotalSets > 0 
      ? Math.round((thisWeekCompletedSets / thisWeekTotalSets) * 100) 
      : 0;
    
    const lastWeekTotalSets = lastWeekSessions.reduce((acc, s) => acc + s.total_sets, 0);
    const lastWeekCompletedSets = lastWeekSessions.reduce((acc, s) => acc + s.completed_sets, 0);
    const lastWeekCompletionRate = lastWeekTotalSets > 0 
      ? Math.round((lastWeekCompletedSets / lastWeekTotalSets) * 100) 
      : 0;
    
    const completionRateTrend = completionRate - lastWeekCompletionRate;
    
    return {
      weeklyCompleted,
      weeklyTarget: activePlan?.weekly_frequency ?? 3,
      weeklyTrend,
      monthlyMinutes,
      monthlyMinutesTrend,
      completionRate,
      completionRateTrend,
      totalSessions: completedSessions.length,
    };
  }, [sessions, activePlan]);
  
  return {
    ...stats,
    isLoading: sessionsLoading || plansLoading,
  };
}
