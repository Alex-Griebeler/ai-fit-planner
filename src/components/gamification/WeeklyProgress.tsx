import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';

interface WeeklyProgressProps {
  compact?: boolean;
}

export function WeeklyProgress({ compact = false }: WeeklyProgressProps) {
  const { sessions } = useWorkoutSessions();
  const { activePlan } = useWorkoutPlans();

  const weeklyTarget = activePlan?.weekly_frequency ?? 3;

  // Calculate sessions completed this week
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const completedThisWeek = sessions.filter(session => {
      if (session.status !== 'completed') return false;
      const sessionDate = new Date(session.completed_at || session.started_at);
      return sessionDate >= startOfWeek;
    }).length;

    // Get days trained this week
    const trainedDays = new Set<number>();
    sessions.forEach(session => {
      if (session.status !== 'completed') return;
      const sessionDate = new Date(session.completed_at || session.started_at);
      if (sessionDate >= startOfWeek) {
        trainedDays.add(sessionDate.getDay());
      }
    });

    return {
      completed: completedThisWeek,
      target: weeklyTarget,
      percentage: Math.min(100, (completedThisWeek / weeklyTarget) * 100),
      trainedDays: Array.from(trainedDays),
    };
  }, [sessions, weeklyTarget]);

  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const today = new Date().getDay();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {dayLabels.map((label, index) => {
            const isTrained = weeklyStats.trainedDays.includes(index);
            const isToday = index === today;
            
            return (
              <motion.div
                key={index}
                initial={isTrained ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  isTrained
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'border-2 border-primary text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isTrained ? <Check className="h-3 w-3" /> : label}
              </motion.div>
            );
          })}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {weeklyStats.completed}/{weeklyStats.target}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">
            Progresso Semanal
          </span>
          <span className="text-muted-foreground">
            {weeklyStats.completed} de {weeklyStats.target} treinos
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${weeklyStats.percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Day indicators */}
      <div className="flex justify-between">
        {dayLabels.map((label, index) => {
          const isTrained = weeklyStats.trainedDays.includes(index);
          const isToday = index === today;
          const isPast = index < today;

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <motion.div
                initial={isTrained ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                  isTrained
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'border-2 border-primary bg-primary/10'
                    : isPast
                    ? 'bg-muted/50'
                    : 'bg-muted'
                }`}
              >
                {isTrained ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className={`h-3 w-3 ${
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                )}
              </motion.div>
              <span className={`text-xs ${
                isToday ? 'font-bold text-primary' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
