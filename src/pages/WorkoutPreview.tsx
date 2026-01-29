import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Play, Clock, Dumbbell, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { generateWorkoutPdf } from '@/lib/generateWorkoutPdf';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { inferMuscleGroupsFromExercises } from '@/lib/workoutScheduler';
import { PageHeader, LoadingScreen, EmptyState } from '@/components/shared';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
interface Exercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  method?: string;
}

interface Workout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: Exercise[];
}

export default function WorkoutPreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get('day');
  const [hasAutoRetried, setHasAutoRetried] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const haptic = useHapticFeedback();

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
      toast.success('PDF baixado com sucesso!', { duration: 2000 });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF', { duration: 4000 });
    }
  };

  const handleStartWorkout = () => {
    haptic.impact();
    navigate(`/workout?day=${encodeURIComponent(workout?.day || '')}`, {
      state: { startWorkout: true }
    });
  };

  if (isLoading || isRetrying) {
    return (
      <LoadingScreen 
        message={isRetrying ? 'Atualizando dados...' : 'Carregando treino...'} 
      />
    );
  }

  if (!workout) {
    return (
      <EmptyState
        icon={<Dumbbell className="w-12 h-12" />}
        title="Hmm, treino não encontrado"
        description="Se você acabou de criar um plano, aguarde um momento e tente atualizar."
        action={
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={handleManualRetry} variant="outline" className="w-full h-12">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate('/dashboard')} className="w-full h-12">
              Voltar ao Dashboard
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <PageHeader 
        title={workout.name}
        backTo="/dashboard"
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadPdf}
            className="press-scale"
            aria-label="Baixar treino em PDF"
          >
            <Download className="w-5 h-5" />
          </Button>
        }
      />
      {/* Workout summary */}
      <div className="px-4 py-4 border-b border-border/50">
        <div className="text-center mb-3">
          <p className="text-sm text-muted-foreground">{workout.focus}</p>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
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
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
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
              transition={{ delay: Math.min(index, 5) * 0.05 }}
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

          {/* Botão de ação - integrado ao scroll */}
          <div className="pt-6 pb-8">
            <Button
              size="lg"
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 press-scale"
              onClick={handleStartWorkout}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Treino
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
