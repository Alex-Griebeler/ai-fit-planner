import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStreak } from '@/hooks/useStreak';
import { Skeleton } from '@/components/ui/skeleton';

interface StreakCardProps {
  compact?: boolean;
}

export function StreakCard({ compact = false }: StreakCardProps) {
  const { streak, isLoading } = useStreak();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className={compact ? 'p-4' : 'p-4'}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  
  // Progress towards record (cap at 100%)
  const progressToRecord = longestStreak > 0 
    ? Math.min((currentStreak / longestStreak) * 100, 100) 
    : 0;
  
  // Check if current streak matches or exceeds the record
  const isAtRecord = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        {/* Main streak display */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={currentStreak > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame 
              className={`h-6 w-6 ${
                currentStreak > 0 
                  ? isAtRecord 
                    ? 'text-yellow-500' 
                    : 'text-orange-500' 
                  : 'text-muted-foreground'
              }`} 
            />
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={currentStreak}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-bold text-lg"
              >
                {currentStreak}
              </motion.span>
              <span className="text-sm text-muted-foreground">
                {currentStreak === 1 ? 'dia' : 'dias'} de sequência
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar towards record */}
        {longestStreak > 0 && (
          <div className="mt-3">
            <Progress 
              value={progressToRecord} 
              className={`h-1.5 ${isAtRecord ? '[&>div]:bg-yellow-500' : ''}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>{isAtRecord ? '🏆 No recorde!' : 'Progresso'}</span>
              <span>Recorde: {longestStreak}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
