import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OnboardingData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  Target, 
  ChevronRight,
  Flame,
  Trophy,
  Sparkles,
  AlertTriangle,
  Info,
  RefreshCw,
  Check
} from 'lucide-react';

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

const goalLabels: Record<string, string> = {
  weight_loss: 'Emagrecimento',
  hypertrophy: 'Hipertrofia',
  health: 'Saúde e Bem-estar',
  performance: 'Performance',
};

export default function Result() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { createPlan, activePlan, isCreating } = useWorkoutPlans();
  
  const [data, setData] = useState<OnboardingData | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const generatePlan = async (userData: OnboardingData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'generate-workout',
        { body: { userData } }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (responseData?.error) {
        if (responseData.error.includes('Rate limit')) {
          toast.error('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.');
        } else if (responseData.error.includes('credits')) {
          toast.error('Créditos de IA esgotados. Entre em contato com o suporte.');
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
      console.error('Error generating workout:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar plano');
      toast.error('Erro ao gerar plano de treino. Tente novamente.');
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
      console.error('Erro ao salvar plano:', err);
      toast.error('Erro ao salvar plano. Tente novamente.');
    }
  };

  useEffect(() => {
    // Verifica se já tem plano ativo
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

    // Busca dados do sessionStorage para gerar novo plano
    const savedData = sessionStorage.getItem('onboardingData');
    if (!savedData && !activePlan) {
      navigate('/onboarding');
      return;
    }

    if (savedData) {
      const parsedData: OnboardingData = JSON.parse(savedData);
      setData(parsedData);
      generatePlan(parsedData);
    }
  }, [navigate, retryCount, activePlan]);

  const handleRetry = () => {
    if (data) {
      setRetryCount(prev => prev + 1);
    }
  };

  const userName = profile?.name || data?.name || 'Atleta';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center"
          >
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Gerando seu plano personalizado...
          </h2>
          <p className="text-muted-foreground mb-4">
            Nossa IA está analisando suas informações
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <span>Aplicando diretrizes técnicas de prescrição</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6 max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Erro ao gerar plano
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={handleRetry} variant="gradient" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/onboarding')}
            >
              Refazer Questionário
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow" />
        <div className="container max-w-lg mx-auto px-4 py-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Parabéns, {userName}! 🎉
            </h1>
            <p className="text-muted-foreground">
              {plan.motivationalMessage || 'Seu plano de treino personalizado está pronto'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-lg mx-auto px-4 pb-8">
        {/* Warnings if any */}
        {plan.warnings && plan.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-500 mb-1">Atenção</p>
                <ul className="text-sm text-yellow-500/80 space-y-1">
                  {plan.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-card"
        >
          <h2 className="text-xl font-display font-bold text-foreground mb-1">
            {plan.planName}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-secondary rounded-xl">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{plan.weeklyFrequency}x</p>
              <p className="text-xs text-muted-foreground">por semana</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-xl">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{plan.sessionDuration}</p>
              <p className="text-xs text-muted-foreground">por treino</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-xl">
              <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{goalLabels[data?.goal || 'health']?.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">objetivo</p>
            </div>
          </div>

          {/* Periodization info */}
          <div className="mt-4 p-3 bg-primary/5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <span className="text-foreground font-medium text-sm">
                Periodização {plan.periodization === 'linear' ? 'Linear' : 'Ondulatória'}
              </span>
            </div>
            {typeof plan.progressionPlan === 'string' ? (
              <p className="text-sm text-muted-foreground">{plan.progressionPlan}</p>
            ) : (
              <div className="space-y-1 text-sm text-muted-foreground">
                {plan.progressionPlan.week1 && <p><span className="text-foreground">Semana 1:</span> {plan.progressionPlan.week1}</p>}
                {plan.progressionPlan.week2 && <p><span className="text-foreground">Semana 2:</span> {plan.progressionPlan.week2}</p>}
                {plan.progressionPlan.week3 && <p><span className="text-foreground">Semana 3:</span> {plan.progressionPlan.week3}</p>}
                {plan.progressionPlan.week4 && <p><span className="text-foreground">Semana 4:</span> {plan.progressionPlan.week4}</p>}
                {plan.progressionPlan.deloadWeek && <p><span className="text-foreground">Deload:</span> {plan.progressionPlan.deloadWeek}</p>}
              </div>
            )}
          </div>
        </motion.div>

        {/* Workouts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-6"
        >
          <h3 className="text-lg font-display font-semibold text-foreground">
            Seus Treinos
          </h3>
          
          {plan.workouts.map((workout, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{workout.day}</p>
                    <p className="text-sm text-muted-foreground">{workout.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{workout.estimatedDuration}</p>
                  <ChevronRight className="w-5 h-5 text-muted-foreground inline" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {workout.muscleGroups.map((muscle) => (
                  <span
                    key={muscle}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    {muscle}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {workout.exercises.map((exercise, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-2 border-t border-border/50"
                  >
                    <div className="flex-1">
                      <span className="text-foreground">{exercise.name}</span>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{exercise.notes}</p>
                      )}
                    </div>
                    <div className="text-right text-muted-foreground shrink-0 ml-2">
                      <span className="font-medium text-foreground">{exercise.sets}x{exercise.reps}</span>
                      <span className="text-xs ml-2">({exercise.rest})</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cardio block if present */}
              {workout.cardio && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-foreground">
                        Cardio - {workout.cardio.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{workout.cardio.duration}</span>
                  </div>
                  {workout.cardio.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{workout.cardio.notes}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Volume */}
        {plan.weeklyVolume && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card"
          >
            <h3 className="text-lg font-display font-semibold text-foreground mb-3">
              Volume Semanal (séries)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(plan.weeklyVolume)
                .filter(([_, value]) => value > 0)
                .map(([muscle, volume]) => (
                  <div key={muscle} className="flex justify-between p-2 bg-secondary rounded-lg">
                    <span className="text-muted-foreground capitalize">
                      {muscle === 'chest' ? 'Peitoral' :
                       muscle === 'back' ? 'Costas' :
                       muscle === 'shoulders' ? 'Ombros' :
                       muscle === 'biceps' ? 'Bíceps' :
                       muscle === 'triceps' ? 'Tríceps' :
                       muscle === 'quadriceps' ? 'Quadríceps' :
                       muscle === 'hamstrings' ? 'Posteriores' :
                       muscle === 'glutes' ? 'Glúteos' :
                       muscle === 'calves' ? 'Panturrilhas' :
                       muscle === 'core' ? 'Core' : muscle}
                    </span>
                    <span className="font-semibold text-foreground">{volume}</span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {!isSaved ? (
            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full"
              onClick={savePlanToDatabase}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 mr-2" />
                  Salvar e Começar Treino
                </>
              )}
            </Button>
          ) : (
            <Button variant="gradient" size="lg" className="w-full">
              <Check className="w-5 h-5 mr-2" />
              Plano Salvo - Começar Treino
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/onboarding')}
          >
            Refazer Questionário
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
