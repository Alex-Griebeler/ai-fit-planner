import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStreak } from '@/hooks/useStreak';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';

interface StreakCardProps {
  compact?: boolean;
}

export function StreakCard({ compact = false }: StreakCardProps) {
  const navigate = useNavigate();
  const { streak, isLoading, isStreakAtRisk } = useStreak();
  const { activePlan } = useWorkoutPlans();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className={compact ? 'p-4' : 'p-4'}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak;
  
  // Progress towards record (or next milestone)
  const targetStreak = longestStreak > currentStreak ? longestStreak : Math.max(currentStreak + 3, 7);
  const progressPercent = Math.min(100, (currentStreak / targetStreak) * 100);
  const daysToTarget = targetStreak - currentStreak;

  // Get first workout day for CTA
  const planData = activePlan?.plan_data as { workouts?: { day: string }[] } | undefined;
  const firstWorkoutDay = planData?.workouts?.[0]?.day;

  const handleClick = () => {
    if (firstWorkoutDay && activePlan) {
      navigate(`/workout-preview?day=${encodeURIComponent(firstWorkoutDay)}`);
    } else {
      navigate('/result');
    }
  };

  // Contextual message
  const getMessage = () => {
    if (currentStreak === 0) return 'Comece sua sequência hoje!';
    if (isNewRecord && currentStreak > 1) return '🎉 Você está no seu recorde!';
    if (isStreakAtRisk) return 'Treine hoje para manter a sequência!';
    if (daysToTarget <= 3) return `Faltam ${daysToTarget} dias para bater seu recorde!`;
    return `Continue assim! Meta: ${targetStreak} dias`;
  };

  return (
    <Card 
      className="shadow-card overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.99]"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label="Ver treino"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Animated flame icon */}
          <motion.div
            className={`relative flex items-center justify-center rounded-full ${
              currentStreak > 0 
                ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                : 'bg-muted'
            } h-12 w-12`}
            animate={currentStreak > 0 ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Flame 
              className={`h-6 w-6 ${
                currentStreak > 0 ? 'text-white' : 'text-muted-foreground'
              }`} 
            />
            {currentStreak > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-red-400 opacity-50"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Streak info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Sequência
              </span>
              {isNewRecord && currentStreak > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-500"
                >
                  <Trophy className="h-3 w-3" />
                  Recorde!
                </motion.div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={currentStreak}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold"
              >
                {currentStreak}
              </motion.span>
              <span className="text-sm text-muted-foreground">
                {currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </div>

          {/* Record info */}
          {longestStreak > 0 && (
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">Recorde</div>
              <div className="font-semibold text-foreground">{longestStreak}</div>
            </div>
          )}

          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>

        {/* Progress bar towards record */}
        {currentStreak > 0 && !isNewRecord && (
          <div className="mt-3 space-y-1.5">
            <Progress value={progressPercent} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {getMessage()}
            </p>
          </div>
        )}

        {/* CTA when at risk or zero */}
        {(currentStreak === 0 || isStreakAtRisk) && !isNewRecord && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              {getMessage()}
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        )}

        {/* Celebration when at record */}
        {isNewRecord && currentStreak > 1 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">
              {getMessage()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
