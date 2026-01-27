import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Dumbbell, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkoutSchedule, type ScheduledWorkout } from '@/hooks/useWorkoutSchedule';
import { cn } from '@/lib/utils';

interface WorkoutInfoProps {
  workout: ScheduledWorkout;
  isPending?: boolean;
}

function WorkoutInfo({ workout, isPending }: WorkoutInfoProps) {
  const exerciseCount = workout.workout.exercises?.length ?? 0;
  
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h3 className="font-semibold text-lg text-foreground">
          {workout.workout.name}
          {isPending && workout.originalDayLabel && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (era pra {workout.originalDayLabel.replace('-feira', '')})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Dumbbell className="w-4 h-4" />
            {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
          </span>
          {!isPending && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {workout.dayLabel}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

export function NextWorkoutCard() {
  const navigate = useNavigate();
  const {
    todayWorkout,
    missedWorkout,
    nextWorkout,
    isWeekComplete,
    isRestDay,
    isLoading,
    hasActivePlan,
    completedCount,
    totalWorkouts,
    skipWorkout,
  } = useWorkoutSchedule();

  // Don't render if no active plan
  if (!hasActivePlan && !isLoading) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Week complete state
  if (isWeekComplete) {
    return (
      <Card className="overflow-hidden border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="pt-6 text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 dark:text-green-400" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-lg text-green-800 dark:text-green-200">
              Semana Completa! 🎉
            </h3>
            <p className="text-sm text-green-700/80 dark:text-green-300/80 mt-1">
              Você completou todos os {totalWorkouts} treinos desta semana.
              <br />
              Nova semana começa no Domingo.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending (missed) workout state
  if (missedWorkout) {
    return (
      <Card className="overflow-hidden border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Clock className="w-5 h-5" />
              Treino Pendente
            </CardTitle>
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300">
              {completedCount}/{totalWorkouts} feitos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkoutInfo workout={missedWorkout} isPending />
          
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/workout')}
              className="flex-1 press-scale bg-amber-600 hover:bg-amber-700 text-white"
            >
              Fazer Agora
            </Button>
            <Button 
              variant="outline"
              onClick={() => skipWorkout(missedWorkout.workout.day)}
              className="press-scale border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
            >
              Pular
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Today's workout state
  if (todayWorkout) {
    return (
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Treino de Hoje
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalWorkouts} feitos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkoutInfo workout={todayWorkout} />
          
          <Button 
            onClick={() => navigate('/workout')}
            className="w-full press-scale"
          >
            Iniciar Treino
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rest day with next workout preview
  if (isRestDay && nextWorkout) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Próximo Treino
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalWorkouts} feitos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <WorkoutInfo workout={nextWorkout} />
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Você está no ritmo! Descanse hoje. 💪
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback: no workout info available
  if (nextWorkout) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Próximo Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkoutInfo workout={nextWorkout} />
          
          <Button 
            variant="outline"
            onClick={() => navigate('/workout')}
            className="w-full press-scale"
          >
            Ver Treinos
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No workouts at all
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6 text-center space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum treino programado para esta semana.
        </p>
      </CardContent>
    </Card>
  );
}
