import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { toast } from 'sonner';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  ChevronDown,
  Flame,
  AlertTriangle,
  RefreshCw,
  Check,
  Timer,
  Sparkles
} from 'lucide-react';
import evolveLogo from '@/assets/evolve-logo.png';

interface WorkoutExercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  tempo?: string;
  notes?: string;
  isCompound?: boolean;
}

interface WorkoutCardio {
  type: string;
  duration: string;
  notes?: string;
}

interface Workout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: WorkoutExercise[];
  cardio?: WorkoutCardio | null;
}

interface ProgressionPlan {
  week1?: string;
  week2?: string;
  week3?: string;
  week4?: string;
  deloadWeek?: string;
}

interface WorkoutPlan {
  planName: string;
  description: string;
  weeklyFrequency: number;
  sessionDuration: string;
  periodization: string;
  workouts: Workout[];
  weeklyVolume: Record<string, number>;
  progressionPlan: string | ProgressionPlan;
  warnings: string[];
  motivationalMessage: string;
}

export default function Result() {
  const navigate = useNavigate();
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const { onboardingData: savedOnboardingData, isLoading: isLoadingOnboarding } = useOnboardingData();
  const { createPlan, activePlan, isCreating, isLoading: isLoadingPlans } = useWorkoutPlans();
  
  const [data, setData] = useState<OnboardingData | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const hasStartedGeneration = useRef(false);

  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Collapsible states
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<number, boolean>>({});
  const [showVolume, setShowVolume] = useState(false);
  const [showProgression, setShowProgression] = useState(false);

  const formatTimeRemaining = (resetAt: Date): string => {
    const now = new Date();
    const diff = resetAt.getTime() - now.getTime();
    if (diff <= 0) return '';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${seconds}s`;
  };

  useEffect(() => {
    if (!isRateLimited || !rateLimitResetAt) return;
    
    const updateTimer = () => {
      setTimeRemaining(formatTimeRemaining(rateLimitResetAt));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [isRateLimited, rateLimitResetAt]);

  const generatePlan = async (userData: OnboardingData) => {
    setLoading(true);
    setError(null);
    setRateLimitResetAt(null);
    setIsRateLimited(false);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'generate-workout',
        { body: { userData } }
      );

      if (responseData?.error === 'Rate limit exceeded' || responseData?.reset_at) {
        const resetAt = new Date(responseData.reset_at);
        setRateLimitResetAt(resetAt);
        setIsRateLimited(true);
        const maxReq = responseData.max_requests || 5;
        throw new Error(`Limite de ${maxReq} gerações por hora atingido.`);
      }

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (responseData?.error) {
        if (responseData.error.includes('credits')) {
          toast.error('Créditos de IA esgotados. Entre em contato com o suporte.');
          throw new Error('Créditos de IA esgotados');
        }
        throw new Error(responseData.error);
      }

      if (responseData?.plan) {
        setPlan(responseData.plan);
        sessionStorage.removeItem('onboardingData');
      } else {
        throw new Error('Plano não gerado');
      }
    } catch (err) {
      console.error('Error generating workout');
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar plano';
      setError(errorMessage);
      
      if (!isRateLimited) {
        toast.error('Erro ao gerar plano de treino. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const savePlanToDatabase = async () => {
    if (!plan) return;

    try {
      await createPlan({
        plan_name: plan.planName,
        description: plan.description,
        weekly_frequency: plan.weeklyFrequency,
        session_duration: plan.sessionDuration,
        periodization: plan.periodization,
        plan_data: JSON.parse(JSON.stringify({
          workouts: plan.workouts,
          weeklyVolume: plan.weeklyVolume,
          progressionPlan: plan.progressionPlan,
          warnings: plan.warnings,
          motivationalMessage: plan.motivationalMessage,
        })),
      });

      setIsSaved(true);
      toast.success('Plano salvo com sucesso!');
    } catch (err) {
      console.error('Error saving workout plan');
      toast.error('Erro ao salvar plano. Tente novamente.');
    }
  };

  useEffect(() => {
    if (isLoadingProfile || isLoadingOnboarding || isLoadingPlans) {
      return;
    }

    if (activePlan && !plan) {
      const savedPlanData = activePlan.plan_data as unknown as {
        workouts: Workout[];
        weeklyVolume: Record<string, number>;
        progressionPlan: string | ProgressionPlan;
        warnings: string[];
        motivationalMessage: string;
      };

      setPlan({
        planName: activePlan.plan_name,
        description: activePlan.description || '',
        weeklyFrequency: activePlan.weekly_frequency,
        sessionDuration: activePlan.session_duration,
        periodization: activePlan.periodization || 'linear',
        workouts: savedPlanData.workouts,
        weeklyVolume: savedPlanData.weeklyVolume,
        progressionPlan: savedPlanData.progressionPlan,
        warnings: savedPlanData.warnings || [],
        motivationalMessage: savedPlanData.motivationalMessage || '',
      });
      setIsSaved(true);
      setLoading(false);
      return;
    }

    if (hasStartedGeneration.current && retryCount === 0) {
      return;
    }

    const savedSessionData = sessionStorage.getItem('onboardingData');
    if (savedSessionData) {
      hasStartedGeneration.current = true;
      const parsedData: OnboardingData = JSON.parse(savedSessionData);
      setData(parsedData);
      generatePlan(parsedData);
      return;
    }

    if (savedOnboardingData && profile) {
      hasStartedGeneration.current = true;
      const fullData: OnboardingData = {
        ...initialOnboardingData,
        goal: savedOnboardingData.goal || null,
        timeframe: savedOnboardingData.timeframe || null,
        trainingDays: savedOnboardingData.trainingDays || [],
        sessionDuration: savedOnboardingData.sessionDuration || null,
        exerciseTypes: savedOnboardingData.exerciseTypes || [],
        includeCardio: savedOnboardingData.includeCardio || false,
        experienceLevel: savedOnboardingData.experienceLevel || null,
        variationPreference: savedOnboardingData.variationPreference || null,
        bodyAreas: savedOnboardingData.bodyAreas || [],
        hasHealthConditions: savedOnboardingData.hasHealthConditions || false,
        injuryAreas: savedOnboardingData.injuryAreas || [],
        healthDescription: savedOnboardingData.healthDescription || '',
        sleepHours: savedOnboardingData.sleepHours || null,
        stressLevel: savedOnboardingData.stressLevel || null,
        name: profile.name || '',
        gender: profile.gender as OnboardingData['gender'] || null,
        age: profile.age || null,
        height: profile.height || null,
        weight: profile.weight || null,
      };
      setData(fullData);
      generatePlan(fullData);
      return;
    }

    if (!savedOnboardingData && !activePlan) {
      navigate('/onboarding');
    }
  }, [navigate, retryCount, activePlan, savedOnboardingData, profile, isLoadingProfile, isLoadingOnboarding, isLoadingPlans, plan]);

  const handleRetry = () => {
    if (data) {
      setRetryCount(prev => prev + 1);
    }
  };

  const toggleWorkout = (index: number) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const userName = profile?.name || data?.name || 'Atleta';

  // Loading State - Apple minimal
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center px-6"
        >
          <motion.img
            src={evolveLogo}
            alt="Evolve"
            className="h-12 mx-auto mb-8 object-contain"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="w-8 h-8 mx-auto mb-6 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-muted-foreground text-sm tracking-wide">
            Gerando plano personalizado
          </p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center px-6 max-w-sm"
        >
          <img
            src={evolveLogo}
            alt="Evolve"
            className="h-10 mx-auto mb-8 object-contain opacity-50"
          />
          
          {isRateLimited ? (
            <>
              <Timer className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                Limite atingido
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Aguarde para gerar novo plano
              </p>
              
              {timeRemaining && (
                <p className="text-2xl font-light text-foreground mb-8 tracking-wider">
                  {timeRemaining}
                </p>
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Voltar
              </Button>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                Erro ao gerar
              </h2>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => navigate('/onboarding')}
                >
                  Refazer questionário
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (!plan) return null;

  const muscleLabels: Record<string, string> = {
    chest: 'Peito',
    back: 'Costas',
    shoulders: 'Ombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    quadriceps: 'Quadríceps',
    hamstrings: 'Posterior',
    glutes: 'Glúteos',
    calves: 'Panturrilha',
    core: 'Core'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero - Ultra minimal */}
      <div className="container max-w-lg mx-auto px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img
            src={evolveLogo}
            alt="Evolve"
            className="h-10 mx-auto mb-6 object-contain"
          />
          <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
            Plano Pronto
          </h1>
          <p className="text-muted-foreground text-sm">
            {userName}
          </p>
        </motion.div>
      </div>

      <div className="container max-w-lg mx-auto px-6 pb-12">
        {/* Warnings - Minimal */}
        {plan.warnings && plan.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 rounded-2xl bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                {plan.warnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan Stats - 3 columns minimal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-semibold text-foreground">{plan.weeklyFrequency}x</p>
            <p className="text-xs text-muted-foreground">semana</p>
          </div>
          <div className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-semibold text-foreground">{plan.sessionDuration}</p>
            <p className="text-xs text-muted-foreground">sessão</p>
          </div>
          <div className="text-center">
            <Dumbbell className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-semibold text-foreground">{plan.workouts.reduce((acc, w) => acc + w.exercises.length, 0)}</p>
            <p className="text-xs text-muted-foreground">exercícios</p>
          </div>
        </motion.div>

        {/* Workouts - Collapsible Apple style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          {plan.workouts.map((workout, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <button
                onClick={() => toggleWorkout(index)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{workout.day}</p>
                    <p className="text-xs text-muted-foreground">{workout.muscleGroups.slice(0, 2).join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{workout.exercises.length} ex</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      expandedWorkouts[index] ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWorkouts[index] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {workout.exercises.map((exercise, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 border-t border-border/50"
                        >
                          <span className="text-sm text-foreground">{exercise.name}</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {exercise.sets}×{exercise.reps}
                          </span>
                        </div>
                      ))}
                      
                      {workout.cardio && (
                        <div className="flex items-center justify-between py-2 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-primary" />
                            <span className="text-sm text-foreground">{workout.cardio.type}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{workout.cardio.duration}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        {/* Volume - Collapsible */}
        {plan.weeklyVolume && Object.values(plan.weeklyVolume).some(v => v > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <button
              onClick={() => setShowVolume(!showVolume)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <span className="text-sm font-medium text-foreground">Volume Semanal</span>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  showVolume ? 'rotate-180' : ''
                }`}
              />
            </button>
            <AnimatePresence>
              {showVolume && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {Object.entries(plan.weeklyVolume)
                      .filter(([_, value]) => value > 0)
                      .map(([muscle, volume]) => (
                        <div key={muscle} className="flex justify-between p-3 bg-muted/50 rounded-xl">
                          <span className="text-xs text-muted-foreground">
                            {muscleLabels[muscle] || muscle}
                          </span>
                          <span className="text-xs font-medium text-foreground">{volume} séries</span>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Progression - Collapsible */}
        {plan.progressionPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <button
              onClick={() => setShowProgression(!showProgression)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <span className="text-sm font-medium text-foreground">Progressão</span>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  showProgression ? 'rotate-180' : ''
                }`}
              />
            </button>
            <AnimatePresence>
              {showProgression && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="text-xs text-muted-foreground pb-4 space-y-2">
                    {typeof plan.progressionPlan === 'string' ? (
                      <p>{plan.progressionPlan}</p>
                    ) : (
                      <>
                        {plan.progressionPlan.week1 && <p><span className="text-foreground">Sem 1:</span> {plan.progressionPlan.week1}</p>}
                        {plan.progressionPlan.week2 && <p><span className="text-foreground">Sem 2:</span> {plan.progressionPlan.week2}</p>}
                        {plan.progressionPlan.week3 && <p><span className="text-foreground">Sem 3:</span> {plan.progressionPlan.week3}</p>}
                        {plan.progressionPlan.week4 && <p><span className="text-foreground">Sem 4:</span> {plan.progressionPlan.week4}</p>}
                        {plan.progressionPlan.deloadWeek && <p><span className="text-foreground">Deload:</span> {plan.progressionPlan.deloadWeek}</p>}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* CTA - Apple minimal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {!isSaved ? (
            <Button 
              size="lg" 
              className="w-full rounded-xl h-12"
              onClick={savePlanToDatabase}
              disabled={isCreating}
            >
              {isCreating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Plano
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" className="w-full rounded-xl h-12" onClick={() => navigate('/dashboard')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Iniciar Treino
            </Button>
          )}
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground"
            onClick={() => navigate('/onboarding')}
          >
            Refazer questionário
          </Button>
        </motion.div>

        {/* Footer logo */}
        <div className="mt-12 text-center">
          <img
            src={evolveLogo}
            alt="Evolve"
            className="h-6 mx-auto opacity-20"
          />
        </div>
      </div>
    </div>
  );
}
