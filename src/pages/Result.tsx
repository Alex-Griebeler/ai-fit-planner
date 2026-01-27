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
  const [showWarnings, setShowWarnings] = useState(false);
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
  if (loading) {
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
            Criando seu plano
          </p>
          <p className="text-muted-foreground text-sm tracking-wide">
            Isso pode levar alguns segundos...
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
              {/* Workout Header */}
              <button
                onClick={() => toggleWorkout(index)}
                aria-expanded={expandedWorkouts[index]}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{workout.day}</p>
                    <p className="text-xs text-muted-foreground">{workout.muscleGroups.map(g => translateMuscleGroup(g)).join(' · ')}</p>
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
                    {/* Table Header - BTB Style */}
                    <div className="px-4 pb-1">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span className="col-span-5">Exercício</span>
                        <span className="col-span-3 text-center">Sets×Reps / Int</span>
                        <span className="col-span-2 text-center">Carga</span>
                        <span className="col-span-2 text-right">Método</span>
                      </div>
                    </div>
                    
                    {/* Exercise Rows */}
                    <div className="px-4 pb-4">
                      {workout.exercises.map((exercise, i) => {
                        const loadKey = `${workout.day}|${exercise.name}`;
                        const savedLoad = loads[loadKey] || '';
                        return (
                          <div
                            key={i}
                            className="grid grid-cols-12 gap-2 items-start py-2.5 border-b border-border/30 last:border-0"
                          >
                            {/* Exercise Name + Intensity Badge */}
                            <div className="col-span-5">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-left w-full">
                                    <span className="text-sm text-foreground block truncate">
                                      {exercise.name}
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" align="start" className="w-64 p-3">
                                  <p className="font-medium text-sm text-foreground">{exercise.name}</p>
                                  {exercise.equipment && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Equipamento: {exercise.equipment}
                                    </p>
                                  )}
                                  {exercise.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">{exercise.notes}</p>
                                  )}
                                </PopoverContent>
                              </Popover>
                              {exercise.intensity && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-[9px] text-muted-foreground/70 font-medium inline-flex items-center gap-0.5">
                                      {exercise.intensity}
                                      <Info className="w-2.5 h-2.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="w-56 p-3">
                                    <p className="font-medium text-sm">RR = Repetições de Reserva</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Quantas repetições você ainda conseguiria fazer antes de falhar completamente.
                                    </p>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            
                            {/* Sets × Reps / Rest */}
                            <span className="col-span-3 text-center text-sm text-foreground font-mono">
                              {exercise.sets}×{exercise.reps} / {exercise.rest || '60s'}
                            </span>
                            
                            {/* Editable Load */}
                            <div className="col-span-2 flex justify-center">
                              <input
                                type="text"
                                placeholder="—"
                                defaultValue={savedLoad}
                                aria-label={`Carga para ${exercise.name}`}
                                className="w-full max-w-[60px] text-center text-xs bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-primary focus:outline-none py-0.5 text-foreground placeholder:text-muted-foreground/50"
                                onBlur={(e) => {
                                  const value = e.target.value.trim();
                                  if (value && value !== savedLoad && isSaved) {
                                    saveLoad(workout.day, exercise.name, value);
                                    toast.success('Carga salva', { duration: 1500 });
                                  }
                                }}
                              />
                            </div>
                            
                            {/* Method */}
                            <span className="col-span-2 text-right text-[10px] text-primary font-medium uppercase">
                              {exercise.method || '—'}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Cardio Row - Enhanced Display */}
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
                              <div className="grid grid-cols-12 gap-2 items-center py-2.5 border-t border-border/50 mt-2 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors -mx-2 px-2">
                                <div className="col-span-5 flex items-center gap-2">
                                  <span className="text-sm">{displayInfo.icon}</span>
                                  <span className="text-sm text-foreground font-medium">
                                    {cardioInfo.info ? cardioInfo.type : displayInfo.name}
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </div>
                                <span className="col-span-3 text-center text-sm text-muted-foreground">
                                  {workout.cardio.duration || cardioInfo.duration}
                                </span>
                                <span className="col-span-2 text-center text-xs text-muted-foreground">
                                  {workout.cardio.intensity || 'Leve'}
                                </span>
                                <span className="col-span-2 text-right text-[10px] text-primary font-medium uppercase">
                                  Cardio
                                </span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" side="top">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{displayInfo.icon}</span>
                                  <h4 className="font-medium text-sm">{displayInfo.name}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {displayInfo.description}
                                </p>
                                {workout.cardio.notes && (
                                  <p className="text-xs text-foreground pt-1 border-t border-border/50">
                                    💡 {workout.cardio.notes}
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })()}
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

        {/* Volume - Collapsible */}
        {plan.weeklyVolume && Object.values(plan.weeklyVolume).some(v => v > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-4"
          >
            <button
              onClick={() => setShowVolume(!showVolume)}
              aria-expanded={showVolume}
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
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <button
              onClick={() => setShowProgression(!showProgression)}
              aria-expanded={showProgression}
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
