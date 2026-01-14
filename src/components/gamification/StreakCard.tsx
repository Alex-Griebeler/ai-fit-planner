import { motion } from 'framer-motion';
import { Flame, Trophy, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useStreak } from '@/hooks/useStreak';
import { Skeleton } from '@/components/ui/skeleton';

interface StreakCardProps {
  compact?: boolean;
}

export function StreakCard({ compact = false }: StreakCardProps) {
  const { streak, isLoading, isStreakAtRisk } = useStreak();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className={compact ? 'p-4' : 'p-6'}>
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

  return (
    <Card className="shadow-card overflow-hidden">
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-center gap-4">
          {/* Animated flame icon */}
          <motion.div
            className={`relative flex items-center justify-center rounded-full ${
              currentStreak > 0 
                ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                : 'bg-muted'
            } ${compact ? 'h-12 w-12' : 'h-14 w-14'}`}
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
              className={`${compact ? 'h-6 w-6' : 'h-7 w-7'} ${
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
          <div className="flex-1">
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
              {isStreakAtRisk && currentStreak > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-500"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Treine hoje!
                </motion.div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={currentStreak}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'}`}
              >
                {currentStreak}
              </motion.span>
              <span className="text-sm text-muted-foreground">
                {currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </div>

          {/* Longest streak badge */}
          {longestStreak > 0 && !compact && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Recorde</div>
              <div className="font-semibold text-foreground">{longestStreak}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
