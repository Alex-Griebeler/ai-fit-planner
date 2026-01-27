import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useExerciseLoads } from '@/hooks/useExerciseLoads';
import { useSubscription } from '@/hooks/useSubscription';
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
  Sparkles,
  Info,
  Target,
  Settings
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


interface WorkoutExercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  isCompound?: boolean;
  method?: string;
}

interface WorkoutCardio {
  type: string;
  duration: string;
  intensity?: string;
  description?: string;
  notes?: string;
}

// Descrições dos tipos de cardio para exibição
const CARDIO_DESCRIPTIONS: Record<string, { name: string; description: string; icon: string }> = {
  'LISS': {
    name: 'Cardio Leve (LISS)',
    description: 'Baixa intensidade, longa duração. Caminhada, bike leve. FC 50-65% máxima.',
    icon: '🚶'
  },
  'MICT': {
    name: 'Cardio Moderado (MICT)',
    description: 'Intensidade moderada. Corrida leve, elíptico. FC 65-75% máxima.',
    icon: '🏃'
  },
  'HIIT': {
    name: 'Cardio Intenso (HIIT)',
    description: 'Alta intensidade intervalada. Sprints, burpees. Séries curtas com descanso.',
    icon: '⚡'
  }
};

// Função para parsear o tipo de cardio e extrair informações
function parseCardioType(cardioType: string): { type: string; duration: string; info: typeof CARDIO_DESCRIPTIONS[string] | null } {
  const normalizedType = cardioType.toUpperCase().trim();
  
  // Verifica se contém algum dos tipos conhecidos
  for (const [key, info] of Object.entries(CARDIO_DESCRIPTIONS)) {
    if (normalizedType.includes(key)) {
      // Extrai a duração se estiver junto (ex: "LISS 20 min")
      const durationMatch = normalizedType.match(/(\d+)\s*(min|minutos?)?/i);
      const duration = durationMatch ? `${durationMatch[1]} min` : '';
      return { type: key, duration, info };
    }
  }
  
  return { type: cardioType, duration: '', info: null };
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
  const { createPlan, activePlan, isCreating, isLoading: isLoadingPlans, plans } = useWorkoutPlans();
  const { isPremium } = useSubscription();
  
  // Get the plan ID for loading exercise loads
  const currentPlanId = activePlan?.id || null;
  const { loads, saveLoad, isLoading: isLoadingLoads } = useExerciseLoads(currentPlanId);
  
  const [data, setData] = useState<OnboardingData | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  // Start with loading false - we'll set it true only when generating a new plan
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const hasStartedGeneration = useRef(false);
  
  // Show loading only while fetching plans data initially
  const isInitialLoading = isLoadingProfile || isLoadingOnboarding || isLoadingPlans;

  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Collapsible states
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<number, boolean>>({});
  const [showWarnings, setShowWarnings] = useState(false);

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

  // Sanitiza trainingDays removendo duplicatas e validando dias
  const sanitizeTrainingDays = (days: string[]): string[] => {
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return [...new Set(days)].filter(day => validDays.includes(day));
  };

  const generatePlan = async (userData: OnboardingData) => {
    setLoading(true);
    setError(null);
    setRateLimitResetAt(null);
    setIsRateLimited(false);

    // Sanitiza os dados antes de enviar
    const sanitizedUserData: OnboardingData = {
      ...userData,
      trainingDays: sanitizeTrainingDays(userData.trainingDays),
    };

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'generate-workout',
        { body: { userData: sanitizedUserData } }
      );

      // Check for rate limit in response data (success case with rate limit info)
      if (responseData?.error?.includes('Limite de gerações') || responseData?.error === 'Rate limit exceeded' || responseData?.reset_at) {
        const resetAt = new Date(responseData.reset_at);
        setRateLimitResetAt(resetAt);
        setIsRateLimited(true);
        const maxReq = responseData.max_requests || 5;
        throw new Error(`Limite de ${maxReq} gerações por hora atingido.`);
      }

      // Handle function errors - check if it's a rate limit 429 error
      if (functionError) {
        // Try to parse rate limit info from the error context
        const errorContext = (functionError as any).context;
        if (errorContext) {
          try {
            const errorBody = typeof errorContext === 'string' ? JSON.parse(errorContext) : errorContext;
            if (errorBody?.reset_at || errorBody?.error?.includes('Limite')) {
              const resetAt = new Date(errorBody.reset_at);
              setRateLimitResetAt(resetAt);
              setIsRateLimited(true);
              const maxReq = errorBody.max_requests || 5;
              throw new Error(`Limite de ${maxReq} gerações por hora atingido.`);
            }
          } catch (parseError) {
            // Not a JSON response, continue with normal error handling
          }
        }
        
        // Check if error message contains rate limit info
        const errorMessage = functionError.message || '';
        if (errorMessage.includes('429') || errorMessage.includes('Limite') || errorMessage.includes('Rate limit')) {
          // Try to extract reset_at from the error message if it contains JSON
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            try {
              const errorBody = JSON.parse(jsonMatch[0]);
              if (errorBody.reset_at) {
                const resetAt = new Date(errorBody.reset_at);
                setRateLimitResetAt(resetAt);
                setIsRateLimited(true);
                const maxReq = errorBody.max_requests || 5;
                throw new Error(`Limite de ${maxReq} gerações por hora atingido.`);
              }
            } catch {
              // Fallback: set rate limited state without specific reset time
              setIsRateLimited(true);
              throw new Error('Limite de gerações atingido. Tente novamente em 1 hora.');
            }
          }
          setIsRateLimited(true);
          throw new Error('Limite de gerações atingido. Tente novamente em 1 hora.');
        }
        
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

    // Check limit for Free users: max 1 plan
    if (!isPremium && plans.length >= 1) {
      toast.error('Limite de 1 plano atingido. Faça upgrade para Premium para planos ilimitados!');
      navigate('/pricing');
      return;
    }

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

      // Pequeno delay para garantir propagação do cache invalidation
      await new Promise(resolve => setTimeout(resolve, 150));

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
      
      // Sanitiza trainingDays do sessionStorage (pode estar corrompido)
      const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      parsedData.trainingDays = [...new Set(parsedData.trainingDays)].filter(d => validDays.includes(d));
      
      // Se estava corrompido, atualiza o sessionStorage
      if (parsedData.trainingDays.length !== JSON.parse(savedSessionData).trainingDays?.length) {
        sessionStorage.setItem('onboardingData', JSON.stringify(parsedData));
      }
      
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

  // Loading State - Apple minimal with progress indicator
  if (loading || isInitialLoading) {
    // If we have an active plan and are just loading initial data, don't show "Criando"
    const isCreatingNewPlan = loading && !activePlan && !plan;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center px-6"
        >
          <motion.div
            className="w-10 h-10 mx-auto mb-6 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            role="status"
            aria-label="Carregando"
          />
          <p className="text-foreground text-base font-medium mb-2">
            {isCreatingNewPlan ? 'Criando seu plano' : 'Carregando...'}
          </p>
          {isCreatingNewPlan && (
            <p className="text-muted-foreground text-sm tracking-wide">
              Isso pode levar alguns segundos...
            </p>
          )}
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
    // English keys
    chest: 'Peitoral',
    back: 'Costas',
    shoulders: 'Ombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    quadriceps: 'Quadríceps',
    hamstrings: 'Posteriores',
    glutes: 'Glúteos',
    calves: 'Panturrilhas',
    core: 'Core',
    scapular_belt: 'Cintura Escapular',
    // Portuguese keys (caso IA já retorne PT)
    'Peitoral': 'Peitoral',
    'Costas': 'Costas',
    'Ombros': 'Ombros',
    'Bíceps': 'Bíceps',
    'Tríceps': 'Tríceps',
    'Quadríceps': 'Quadríceps',
    'Posteriores': 'Posteriores',
    'Glúteos': 'Glúteos',
    'Panturrilhas': 'Panturrilhas',
    'Core': 'Core',
    'Cintura Escapular': 'Cintura Escapular',
  };

  const translateMuscleGroup = (group: string): string => {
    return muscleLabels[group] || muscleLabels[group.toLowerCase()] || group;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero - Ultra minimal */}
      <div className="container max-w-xl mx-auto px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="text-left">
            <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
              Plano Pronto
            </h1>
            <p className="text-muted-foreground text-sm">
              {userName}
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.div>
      </div>

      <div className="container max-w-xl mx-auto px-6 pb-12">

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
            <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-semibold text-foreground">
              {(() => {
                const displayGoal = data?.goal 
                  || (activePlan?.plan_data as Record<string, unknown>)?.goal as string
                  || savedOnboardingData?.goal 
                  || 'Geral';
                const goalLabels: Record<string, string> = {
                  weight_loss: 'Emagrecimento',
                  hypertrophy: 'Hipertrofia',
                  health: 'Saúde',
                  performance: 'Performance',
                };
                return goalLabels[displayGoal] || displayGoal;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">objetivo</p>
          </div>
        </motion.div>

        {/* Workouts - Ultra-minimal Apple style */}
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
              {/* Workout Header - Clean & Minimal */}
              <button
                onClick={() => toggleWorkout(index)}
                aria-expanded={expandedWorkouts[index]}
                className="w-full p-5 flex items-center justify-between text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-base">{workout.name || workout.day}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {workout.exercises.length} exercícios · {workout.estimatedDuration || plan.sessionDuration}
                    </p>
                  </div>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                    expandedWorkouts[index] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {expandedWorkouts[index] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    {/* Muscle Groups Pills */}
                    <div className="px-5 pb-3 flex flex-wrap gap-2">
                      {workout.muscleGroups.map((group, i) => (
                        <span 
                          key={i} 
                          className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground"
                        >
                          {translateMuscleGroup(group)}
                        </span>
                      ))}
                    </div>
                    
                    {/* Exercise List - Clean rows */}
                    <div className="px-5 pb-5 space-y-1">
                      {workout.exercises.map((exercise, i) => {
                        const loadKey = `${workout.day}|${exercise.name}`;
                        const savedLoad = loads[loadKey] || '';
                        
                        return (
                          <Popover key={i}>
                            <PopoverTrigger asChild>
                              <button className="w-full flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors text-left group">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground/60 font-mono w-5 shrink-0">
                                    {exercise.order || i + 1}
                                  </span>
                                  <span className="text-sm text-foreground truncate">
                                    {exercise.name}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground font-mono shrink-0 ml-3">
                                  {exercise.sets}×{exercise.reps}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-72 p-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                                  {exercise.equipment && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{exercise.equipment}</p>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-muted/50">
                                    <p className="text-lg font-semibold text-foreground">{exercise.sets}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Séries</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-muted/50">
                                    <p className="text-lg font-semibold text-foreground">{exercise.reps}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Reps</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-muted/50">
                                    <p className="text-lg font-semibold text-foreground">{exercise.rest || '60s'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Descanso</p>
                                  </div>
                                </div>
                                
                                {(exercise.intensity || exercise.method) && (
                                  <div className="flex gap-2 flex-wrap">
                                    {exercise.intensity && (
                                      <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">
                                        {exercise.intensity}
                                      </span>
                                    )}
                                    {exercise.method && (
                                      <span className="text-xs px-2 py-1 rounded-md bg-accent/10 text-accent-foreground">
                                        {exercise.method}
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {isSaved && (
                                  <div className="pt-2 border-t border-border">
                                    <label className="text-xs text-muted-foreground block mb-1">Carga utilizada</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: 20kg"
                                      defaultValue={savedLoad}
                                      aria-label={`Carga para ${exercise.name}`}
                                      className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                                      onBlur={(e) => {
                                        const value = e.target.value.trim();
                                        if (value && value !== savedLoad) {
                                          saveLoad(workout.day, exercise.name, value);
                                          toast.success('Carga salva', { duration: 1500 });
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {exercise.notes && (
                                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                                    💡 {exercise.notes}
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                      
                      {/* Cardio Row - Minimal */}
                      {workout.cardio && (() => {
                        const cardioInfo = parseCardioType(workout.cardio.type);
                        const displayInfo = cardioInfo.info || {
                          name: workout.cardio.type,
                          description: workout.cardio.description || 'Exercício cardiovascular',
                          icon: '❤️'
                        };
                        
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors text-left mt-2 border-t border-border/50 pt-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-base">{displayInfo.icon}</span>
                                  <span className="text-sm text-foreground">
                                    {displayInfo.name}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {workout.cardio.duration || cardioInfo.duration}
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-4" side="top">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{displayInfo.icon}</span>
                                  <h4 className="font-semibold text-foreground">{displayInfo.name}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {displayInfo.description}
                                </p>
                                <div className="flex gap-4 text-center">
                                  <div>
                                    <p className="text-lg font-semibold text-foreground">{workout.cardio.duration || cardioInfo.duration}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Duração</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-foreground">{workout.cardio.intensity || 'Leve'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Intensidade</p>
                                  </div>
                                </div>
                                {workout.cardio.notes && (
                                  <p className="text-xs text-foreground pt-2 border-t border-border">
                                    💡 {workout.cardio.notes}
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })()}
                    </div>
                    
                    {/* Quick Action - Start Workout */}
                    <div className="px-5 pb-5">
                      <Button
                        variant="outline"
                        className="w-full rounded-xl h-11"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workout-preview?day=${encodeURIComponent(workout.day)}`);
                        }}
                      >
                        <Flame className="w-4 h-4 mr-2" />
                        Iniciar Treino
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        {/* Warnings - Collapsible */}
        {plan.warnings && plan.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <button
              onClick={() => setShowWarnings(!showWarnings)}
              aria-expanded={showWarnings}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Atenção</span>
                <span className="text-xs text-muted-foreground">({plan.warnings.length})</span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  showWarnings ? 'rotate-180' : ''
                }`}
              />
            </button>
            <AnimatePresence>
              {showWarnings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pb-4">
                    {plan.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-6">
                        {warning}
                      </p>
                    ))}
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
              className="w-full rounded-xl h-12 press-scale"
              onClick={savePlanToDatabase}
              disabled={isCreating}
              aria-label="Salvar plano de treino"
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
            <Button 
              size="lg" 
              className="w-full rounded-xl h-12 press-scale" 
              onClick={() => navigate('/dashboard')}
              aria-label="Ir para o dashboard"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Ir para Dashboard
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

      </div>
    </div>
  );
}
