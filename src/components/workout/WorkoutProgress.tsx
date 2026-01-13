import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WorkoutProgressProps {
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
}

export function WorkoutProgress({
  totalExercises,
  completedExercises,
  totalSets,
  completedSets,
}: WorkoutProgressProps) {
  const exerciseProgress = (completedExercises / totalExercises) * 100;
  const setProgress = (completedSets / totalSets) * 100;

  return (
    <div className="space-y-4">
      {/* Main progress bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${setProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            completedExercises === totalExercises ? "bg-green-500" : "bg-primary"
          )} />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{completedExercises}</strong>/{totalExercises} exercícios
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            completedSets === totalSets ? "bg-green-500" : "bg-primary"
          )} />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{completedSets}</strong>/{totalSets} séries
          </span>
        </div>
      </div>
    </div>
  );
}
