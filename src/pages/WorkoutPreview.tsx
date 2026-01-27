import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Play, Clock, Dumbbell, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { generateWorkoutPdf } from '@/lib/generateWorkoutPdf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { inferMuscleGroupsFromExercises } from '@/lib/workoutScheduler';
import type { Workout } from '@/types/workout';

export default function WorkoutPreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get('day');
  const [hasAutoRetried, setHasAutoRetried] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const { activePlan, isLoading, refetchPlans } = useWorkoutPlans();

  const workout = useMemo(() => {
    if (!activePlan?.plan_data) return null;
    const planData = activePlan.plan_data as { workouts?: Workout[] };
    if (!planData.workouts) return null;
    
    return planData.workouts.find(w => w.day === dayParam) || planData.workouts[0];
  }, [activePlan, dayParam]);

  // Auto-retry uma vez se não encontrar o treino (resolve problemas de cache)
  useEffect(() => {
    if (!isLoading && !workout && !hasAutoRetried && activePlan === null) {
      setHasAutoRetried(true);
      setIsRetrying(true);
      refetchPlans().finally(() => setIsRetrying(false));
    }
  }, [isLoading, workout, hasAutoRetried, activePlan, refetchPlans]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    await refetchPlans();
    setIsRetrying(false);
  };

  const handleDownloadPdf = () => {
    if (!workout || !activePlan) return;
    
    try {
      generateWorkoutPdf({
        planName: activePlan.plan_name,
        workout,
        createdAt: new Date(activePlan.created_at),
      });
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleStartWorkout = () => {
    navigate(`/workout?day=${encodeURIComponent(workout?.day || '')}`);
  };

  if (isLoading || isRetrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">
            {isRetrying ? 'Atualizando dados...' : 'Carregando treino...'}
          </span>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-2">Treino não encontrado</p>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          Se você acabou de criar um plano, aguarde um momento e tente atualizar.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={handleManualRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors press-scale"
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="font-semibold">{workout.name}</h1>
              <p className="text-xs text-muted-foreground">{workout.focus}</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadPdf}
              className="press-scale"
              aria-label="Baixar treino em PDF"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Workout summary */}
      <div className="px-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            <span>{workout.exercises.length} exercícios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{workout.estimatedDuration || '45-60min'}</span>
          </div>
        </div>
        {(() => {
          const muscleGroups = inferMuscleGroupsFromExercises(workout.exercises);
          return muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {muscleGroups.map((group, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Exercise list */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {workout.exercises.map((exercise, index) => (
            <motion.div
              key={`${exercise.name}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{exercise.order}
                    </span>
                    {exercise.method && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-primary/10 text-primary border-0">
                        {exercise.method}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-foreground line-clamp-2">
                    {exercise.name}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {exercise.equipment}
                  </p>
                </div>

                {(exercise.notes || exercise.tempo) && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0"
                        aria-label={`Ver detalhes de ${exercise.name}`}
                      >
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-2 text-sm">
                        {exercise.tempo && (
                          <p><strong>Tempo:</strong> {exercise.tempo}</p>
                        )}
                        {exercise.notes && (
                          <p className="text-muted-foreground">{exercise.notes}</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Prescription row */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="font-mono font-medium">
                  {exercise.sets} × {exercise.reps}
                </span>
                <span className="text-muted-foreground">
                  ⏱️ {exercise.rest}
                </span>
                {exercise.intensity && (
                  <span className="text-muted-foreground">
                    💪 {exercise.intensity}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-14 rounded-2xl press-scale"
            onClick={handleDownloadPdf}
          >
            <Download className="w-5 h-5 mr-2" />
            Baixar PDF
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 press-scale"
            onClick={handleStartWorkout}
          >
            <Play className="w-5 h-5 mr-2" />
            Iniciar Treino
          </Button>
        </div>
      </div>
    </div>
  );
}
