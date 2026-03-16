import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useExerciseLoads } from '@/hooks/useExerciseLoads';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { RestTimer } from '@/components/workout/RestTimer';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { WorkoutProgress } from '@/components/workout/WorkoutProgress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LoadingScreen, EmptyState } from '@/components/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function WorkoutExecution() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get('day');
  
  // Check if this is an intentional start from WorkoutPreview
  const isIntentionalStart = location.state?.startWorkout === true;
  const sessionInitializedRef = useRef(false);

  const { activePlan, isLoading } = useWorkoutPlans();
  const { loads, saveLoad } = useExerciseLoads(activePlan?.id || null);
  const { 
    currentSession,
    startSession, 
    updateSession, 
    completeSession, 
    abandonSession 
  } = useWorkoutSessions();

  // State
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(60);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [localLoads, setLocalLoads] = useState<Record<string, string>>({});
  const [workoutStartTime] = useState(new Date());

  // Get workout data
  const workout = useMemo(() => {
    if (!activePlan?.plan_data) return null;
    const planData = activePlan.plan_data as { workouts?: Workout[] };
    if (!planData.workouts) return null;
    
    return planData.workouts.find(w => w.day === dayParam) || planData.workouts[0];
  }, [activePlan, dayParam]);

  // Initialize local loads from saved loads
  useEffect(() => {
    if (loads && workout) {
      const loadMap: Record<string, string> = {};
      workout.exercises.forEach(ex => {
        const key = `${workout.day}|${ex.name}`;
        if (loads[key]) {
          loadMap[ex.name] = loads[key];
        }
      });
      setLocalLoads(loadMap);
    }
  }, [loads, workout]);

  // Start session when workout loads - only if intentionally started from preview
  useEffect(() => {
    // Only create a new session if:
    // 1. We have workout data and active plan
    // 2. There's no current session
    // 3. This is an intentional navigation from WorkoutPreview (has startWorkout state)
    // 4. We haven't already initialized a session in this component mount
    if (workout && activePlan && !currentSession && isIntentionalStart && !sessionInitializedRef.current) {
      sessionInitializedRef.current = true;
      const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
      startSession({
        workoutPlanId: activePlan.id,
        workoutDay: workout.day,
        workoutName: workout.name,
        totalSets,
      }).catch((error) => {
        // Silently handle "recently completed" errors
        if (!error.message?.includes('recently completed')) {
          console.error('Error starting session:', error);
        }
      });
    }
  }, [workout, activePlan, currentSession, isIntentionalStart, startSession]);

  // Parse rest time from string like "60s" or "2min"
  const parseRestTime = useCallback((rest: string): number => {
    const match = rest.match(/(\d+)/);
    if (!match) return 60;
    const value = parseInt(match[1]);
    if (rest.toLowerCase().includes('min')) return value * 60;
    return value;
  }, []);

  // Calculate progress
  const progressStats = useMemo(() => {
    if (!workout) return { totalExercises: 0, completedExercises: 0, totalSets: 0, completedSets: 0 };
    
    const totalExercises = workout.exercises.length;
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSetsCount = Object.values(completedSets).reduce((sum, sets) => sum + sets, 0);
    const completedExercisesCount = workout.exercises.filter(
      (_, index) => completedSets[index] >= workout.exercises[index].sets
    ).length;

    return {
      totalExercises,
      completedExercises: completedExercisesCount,
      totalSets,
      completedSets: completedSetsCount,
    };
  }, [workout, completedSets]);

  const isWorkoutComplete = progressStats.completedSets === progressStats.totalSets;
  const canFinishEarly = progressStats.completedSets >= progressStats.totalSets * 0.5;

  // Handle complete exercise (all sets at once)
  const handleCompleteExercise = useCallback((exerciseIndex: number) => {
    const exercise = workout?.exercises[exerciseIndex];
    if (!exercise) return;

    // Mark all sets as complete
    const newCompletedSets = {
      ...completedSets,
      [exerciseIndex]: exercise.sets,
    };
    setCompletedSets(newCompletedSets);

    // Haptic feedback - double vibration pattern
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    // Update session in database
    if (currentSession) {
      const totalCompleted = Object.values(newCompletedSets).reduce((sum, sets) => sum + sets, 0);
      const exercisesData = workout?.exercises.map((ex, idx) => ({
        name: ex.name,
        completedSets: newCompletedSets[idx] || 0,
        totalSets: ex.sets,
        load: localLoads[ex.name] || null,
      }));
      
      updateSession(currentSession.id, {
        completedSets: totalCompleted,
        exercisesData,
      }).catch(console.error);
    }

    // Auto-advance to next exercise
    if (workout && exerciseIndex < workout.exercises.length - 1) {
      setTimeout(() => {
        setActiveExerciseIndex(exerciseIndex + 1);
      }, 300);
    }

    toast.success(`${exercise.name} completo!`, { duration: 2000 });
  }, [workout, completedSets, currentSession, localLoads, updateSession]);

  // Handle single set completion (for granular tracking)
  const handleSetComplete = useCallback((exerciseIndex: number, setNumber: number) => {
    const newCompletedSets = {
      ...completedSets,
      [exerciseIndex]: (completedSets[exerciseIndex] || 0) + 1,
    };
    setCompletedSets(newCompletedSets);

    const exercise = workout?.exercises[exerciseIndex];
    if (exercise) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Update session in database
      if (currentSession) {
        const totalCompleted = Object.values(newCompletedSets).reduce((sum, sets) => sum + sets, 0);
        const exercisesData = workout?.exercises.map((ex, idx) => ({
          name: ex.name,
          completedSets: newCompletedSets[idx] || 0,
          totalSets: ex.sets,
          load: localLoads[ex.name] || null,
        }));
        
        updateSession(currentSession.id, {
          completedSets: totalCompleted,
          exercisesData,
        }).catch(console.error);
      }
    }
  }, [workout, completedSets, currentSession, localLoads, updateSession]);

  // Handle set undo
  const handleSetUndo = useCallback((exerciseIndex: number, setNumber: number) => {
    const newCompletedSets = {
      ...completedSets,
      [exerciseIndex]: Math.max(0, (completedSets[exerciseIndex] || 0) - 1),
    };
    setCompletedSets(newCompletedSets);

    // Persist undo to backend
    if (currentSession && workout) {
      const totalCompleted = Object.values(newCompletedSets).reduce((sum, sets) => sum + sets, 0);
      const exercisesData = workout.exercises.map((ex, idx) => ({
        name: ex.name,
        completedSets: newCompletedSets[idx] || 0,
        totalSets: ex.sets,
        load: localLoads[ex.name] || null,
      }));

      updateSession(currentSession.id, {
        completedSets: totalCompleted,
        exercisesData,
      }).catch(console.error);
    }
  }, [workout, completedSets, currentSession, localLoads, updateSession]);

  // Handle manual timer start
  const handleStartTimer = useCallback((exerciseIndex: number) => {
    const exercise = workout?.exercises[exerciseIndex];
    if (exercise) {
      const restTime = parseRestTime(exercise.rest);
      setCurrentRestTime(restTime);
      setShowTimer(true);
    }
  }, [workout, parseRestTime]);

  // Handle load change
  const handleLoadChange = useCallback((exerciseName: string, value: string) => {
    setLocalLoads(prev => ({ ...prev, [exerciseName]: value }));
    // Auto-save on change
    if (value && workout) {
      saveLoad(workout.day, exerciseName, value);
    }
  }, [workout, saveLoad]);

  // Handle exit
  const handleExit = useCallback(() => {
    if (progressStats.completedSets > 0 && !isWorkoutComplete) {
      setShowExitDialog(true);
    } else {
      navigate('/dashboard');
    }
  }, [progressStats.completedSets, isWorkoutComplete, navigate]);

  // Handle workout completion
  const handleFinishWorkout = useCallback(async () => {
    if (currentSession) {
      try {
        await completeSession(currentSession.id);
        const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);
        navigate('/workout-complete', {
          state: {
            sessionId: currentSession.id,
            durationMinutes: duration,
            completedSets: progressStats.completedSets,
            totalSets: progressStats.totalSets,
            workoutName: workout?.name ?? 'Treino',
          },
        });
      } catch (error) {
        console.error('Error completing session:', error);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  }, [currentSession, completeSession, workoutStartTime, navigate, progressStats, workout]);

  // Navigate between exercises
  const goToNextExercise = useCallback(() => {
    if (workout && activeExerciseIndex < workout.exercises.length - 1) {
      setActiveExerciseIndex(prev => prev + 1);
    }
  }, [workout, activeExerciseIndex]);

  const goToPreviousExercise = useCallback(() => {
    if (activeExerciseIndex > 0) {
      setActiveExerciseIndex(prev => prev - 1);
    }
  }, [activeExerciseIndex]);

  if (isLoading) {
    return <LoadingScreen message="Carregando treino..." />;
  }

  if (!workout) {
    return (
      <EmptyState
        title="Hmm, treino não encontrado"
        description="Que tal voltar e tentar novamente?"
        action={
          <Button onClick={() => navigate('/dashboard')} className="h-12">
            Voltar ao Dashboard
          </Button>
        }
      />
    );
  }

  const activeExercise = workout.exercises[activeExerciseIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleExit}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors press-scale"
              aria-label="Sair do treino"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="font-semibold text-sm">{workout.name}</h1>
              <p className="text-xs text-muted-foreground">{workout.focus}</p>
            </div>

            <div className="w-9" /> {/* Spacer for alignment */}
          </div>

          <WorkoutProgress {...progressStats} />
        </div>
      </header>

      {/* Timer overlay */}
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="text-center"
            >
              <h2 className="text-xl font-semibold mb-2">Tempo de Descanso</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {activeExercise?.name}
              </p>
              
              <RestTimer
                initialSeconds={currentRestTime}
                autoStart
                onComplete={() => setShowTimer(false)}
              />

              <Button
                variant="ghost"
                className="mt-8 press-scale"
                onClick={() => setShowTimer(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Pular descanso
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise list */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {workout.exercises.map((exercise, index) => (
            <ExerciseCard
              key={`${exercise.name}-${index}`}
              exercise={exercise}
              completedSets={completedSets[index] || 0}
              onSetComplete={(setNum) => handleSetComplete(index, setNum)}
              onSetUndo={(setNum) => handleSetUndo(index, setNum)}
              load={localLoads[exercise.name]}
              onLoadChange={(value) => handleLoadChange(exercise.name, value)}
              isActive={activeExerciseIndex === index}
              onSelect={() => setActiveExerciseIndex(index)}
              onCompleteExercise={() => handleCompleteExercise(index)}
              onStartTimer={() => handleStartTimer(index)}
              restTime={exercise.rest}
            />
          ))}

          {/* Action buttons - scrolls with content */}
          <div className="pt-6 pb-8">
            {isWorkoutComplete ? (
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl text-lg font-semibold bg-green-500 hover:bg-green-600 press-scale"
                onClick={handleFinishWorkout}
              >
                <Check className="w-5 h-5 mr-2" />
                Finalizar Treino
              </Button>
            ) : canFinishEarly ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 rounded-xl press-scale"
                    onClick={goToPreviousExercise}
                    disabled={activeExerciseIndex === 0}
                  >
                    <ChevronUp className="w-5 h-5 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-12 rounded-xl press-scale"
                    onClick={goToNextExercise}
                    disabled={activeExerciseIndex === workout.exercises.length - 1}
                  >
                    Próximo
                    <ChevronDown className="w-5 h-5 ml-1" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "w-full h-12 rounded-xl border-orange-500/50 text-orange-600 hover:bg-orange-500/10 press-scale"
                  )}
                  onClick={handleFinishWorkout}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Encerrar Treino ({Math.round((progressStats.completedSets / progressStats.totalSets) * 100)}%)
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 rounded-2xl press-scale"
                  onClick={goToPreviousExercise}
                  disabled={activeExerciseIndex === 0}
                >
                  <ChevronUp className="w-5 h-5 mr-1" />
                  Anterior
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 rounded-2xl press-scale"
                  onClick={goToNextExercise}
                  disabled={activeExerciseIndex === workout.exercises.length - 1}
                >
                  Próximo
                  <ChevronDown className="w-5 h-5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Você completou {progressStats.completedSets} de {progressStats.totalSets} séries. 
              Seu progresso não será salvo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treino</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (currentSession) {
                await abandonSession(currentSession.id).catch(console.error);
              }
              navigate('/dashboard');
            }}>
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
