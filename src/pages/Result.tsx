import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OnboardingData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  Target, 
  ChevronRight,
  Flame,
  Trophy,
  Sparkles
} from 'lucide-react';

interface WorkoutPlan {
  name: string;
  description: string;
  weeklyFrequency: number;
  sessionDuration: string;
  workouts: Workout[];
}

interface Workout {
  day: string;
  name: string;
  muscleGroups: string[];
  exercises: Exercise[];
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  equipment: string;
}

const goalLabels: Record<string, string> = {
  weight_loss: 'Emagrecimento',
  hypertrophy: 'Hipertrofia',
  health: 'Saúde e Bem-estar',
  performance: 'Performance',
};

const dayLabels: Record<string, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
};

export default function Result() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
      navigate('/onboarding');
      return;
    }

    const parsedData: OnboardingData = JSON.parse(savedData);
    setData(parsedData);

    // Simulate AI generating the plan
    setTimeout(() => {
      const generatedPlan = generateWorkoutPlan(parsedData);
      setPlan(generatedPlan);
      setLoading(false);
    }, 2000);
  }, [navigate]);

  const generateWorkoutPlan = (userData: OnboardingData): WorkoutPlan => {
    const daysCount = userData.trainingDays.length;
    const isBegineer = userData.experienceLevel === 'beginner';
    
    // Create workouts based on training days
    const workouts: Workout[] = userData.trainingDays.map((day, index) => {
      const workoutTypes = getWorkoutTypes(daysCount, index, userData);
      return {
        day: dayLabels[day] || day,
        name: workoutTypes.name,
        muscleGroups: workoutTypes.muscles,
        exercises: generateExercises(workoutTypes.muscles, userData, isBegineer),
      };
    });

    const durationLabel = {
      '30min': '30 minutos',
      '45min': '45 minutos',
      '60min': '60 minutos',
      '60plus': '+60 minutos',
    }[userData.sessionDuration || '45min'];

    return {
      name: getPlanName(userData.goal),
      description: `Plano personalizado para ${goalLabels[userData.goal || 'health']}`,
      weeklyFrequency: daysCount,
      sessionDuration: durationLabel || '45 minutos',
      workouts,
    };
  };

  const getPlanName = (goal: string | null): string => {
    switch (goal) {
      case 'weight_loss':
        return 'Programa Definição Total';
      case 'hypertrophy':
        return 'Programa Massa Muscular';
      case 'performance':
        return 'Programa Alta Performance';
      default:
        return 'Programa Saúde Integral';
    }
  };

  const getWorkoutTypes = (totalDays: number, dayIndex: number, userData: OnboardingData) => {
    // Simple split logic based on number of training days
    if (totalDays <= 2) {
      return { name: 'Treino Full Body', muscles: ['Corpo Inteiro'] };
    }
    
    if (totalDays === 3) {
      const splits = [
        { name: 'Treino A - Push', muscles: ['Peitoral', 'Ombros', 'Tríceps'] },
        { name: 'Treino B - Pull', muscles: ['Costas', 'Bíceps'] },
        { name: 'Treino C - Legs', muscles: ['Quadríceps', 'Posteriores', 'Glúteos'] },
      ];
      return splits[dayIndex % 3];
    }

    if (totalDays === 4) {
      const splits = [
        { name: 'Treino A - Superior', muscles: ['Peitoral', 'Costas'] },
        { name: 'Treino B - Inferior', muscles: ['Quadríceps', 'Posteriores'] },
        { name: 'Treino C - Push', muscles: ['Ombros', 'Tríceps', 'Peitoral'] },
        { name: 'Treino D - Pull', muscles: ['Costas', 'Bíceps'] },
      ];
      return splits[dayIndex % 4];
    }

    // 5+ days
    const splits = [
      { name: 'Treino A - Peitoral', muscles: ['Peitoral', 'Tríceps'] },
      { name: 'Treino B - Costas', muscles: ['Costas', 'Bíceps'] },
      { name: 'Treino C - Ombros', muscles: ['Ombros', 'Trapézio'] },
      { name: 'Treino D - Pernas', muscles: ['Quadríceps', 'Posteriores'] },
      { name: 'Treino E - Glúteos', muscles: ['Glúteos', 'Core'] },
      { name: 'Treino F - Full Body', muscles: ['Corpo Inteiro'] },
      { name: 'Treino G - Cardio', muscles: ['Cardio', 'Core'] },
    ];
    return splits[dayIndex % splits.length];
  };

  const generateExercises = (muscles: string[], userData: OnboardingData, isBegineer: boolean): Exercise[] => {
    const exerciseDatabase: Record<string, Exercise[]> = {
      'Peitoral': [
        { name: 'Supino Reto Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Supino Inclinado Smith', sets: 3, reps: '10-12', equipment: 'Smith' },
        { name: 'Crucifixo Máquina', sets: 3, reps: '12-15', equipment: 'Máquina' },
      ],
      'Costas': [
        { name: 'Puxada Frontal', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Remada Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Pulldown', sets: 3, reps: '12-15', equipment: 'Cabo' },
      ],
      'Ombros': [
        { name: 'Desenvolvimento Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Elevação Lateral', sets: 3, reps: '12-15', equipment: 'Halteres' },
        { name: 'Elevação Frontal', sets: 3, reps: '12-15', equipment: 'Cabo' },
      ],
      'Bíceps': [
        { name: 'Rosca Direta Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Rosca Martelo', sets: 3, reps: '10-12', equipment: 'Halteres' },
      ],
      'Tríceps': [
        { name: 'Tríceps Pulley', sets: 3, reps: '10-12', equipment: 'Cabo' },
        { name: 'Tríceps Francês', sets: 3, reps: '10-12', equipment: 'Halteres' },
      ],
      'Quadríceps': [
        { name: 'Leg Press', sets: 4, reps: '10-12', equipment: 'Máquina' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12-15', equipment: 'Máquina' },
        { name: 'Agachamento Smith', sets: 3, reps: '10-12', equipment: 'Smith' },
      ],
      'Posteriores': [
        { name: 'Cadeira Flexora', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Mesa Flexora', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Stiff Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
      ],
      'Glúteos': [
        { name: 'Glúteo Máquina', sets: 4, reps: '12-15', equipment: 'Máquina' },
        { name: 'Abdução de Quadril', sets: 3, reps: '15-20', equipment: 'Máquina' },
        { name: 'Elevação Pélvica', sets: 3, reps: '12-15', equipment: 'Barra' },
      ],
      'Core': [
        { name: 'Prancha', sets: 3, reps: '30-45s', equipment: 'Peso Corporal' },
        { name: 'Abdominal Máquina', sets: 3, reps: '15-20', equipment: 'Máquina' },
      ],
      'Trapézio': [
        { name: 'Encolhimento com Halteres', sets: 3, reps: '12-15', equipment: 'Halteres' },
      ],
      'Corpo Inteiro': [
        { name: 'Supino Máquina', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Puxada Frontal', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Leg Press', sets: 3, reps: '10-12', equipment: 'Máquina' },
        { name: 'Desenvolvimento Ombros', sets: 3, reps: '10-12', equipment: 'Máquina' },
      ],
      'Cardio': [
        { name: 'Esteira', sets: 1, reps: '20-30min', equipment: 'Cardio' },
        { name: 'Bicicleta Ergométrica', sets: 1, reps: '15-20min', equipment: 'Cardio' },
      ],
    };

    let exercises: Exercise[] = [];
    muscles.forEach((muscle) => {
      const muscleExercises = exerciseDatabase[muscle] || [];
      exercises = [...exercises, ...muscleExercises.slice(0, isBegineer ? 2 : 3)];
    });

    return exercises.slice(0, isBegineer ? 5 : 7);
  };

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
          <p className="text-muted-foreground">
            Nossa IA está analisando suas informações
          </p>
        </motion.div>
      </div>
    );
  }

  if (!plan || !data) return null;

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
              Parabéns, {data.name}! 🎉
            </h1>
            <p className="text-muted-foreground">
              Seu plano de treino personalizado está pronto
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-lg mx-auto px-4 pb-8">
        {/* Plan Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-card"
        >
          <h2 className="text-xl font-display font-bold text-foreground mb-1">
            {plan.name}
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
              <p className="text-lg font-bold text-foreground">{plan.sessionDuration.replace(' minutos', 'min')}</p>
              <p className="text-xs text-muted-foreground">por treino</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-xl">
              <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{goalLabels[data.goal || 'health'].split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">objetivo</p>
            </div>
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
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
                {workout.exercises.slice(0, 3).map((exercise, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-2 border-t border-border/50"
                  >
                    <span className="text-foreground">{exercise.name}</span>
                    <span className="text-muted-foreground">
                      {exercise.sets}x{exercise.reps}
                    </span>
                  </div>
                ))}
                {workout.exercises.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{workout.exercises.length - 3} exercícios
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button variant="gradient" size="lg" className="w-full">
            <Flame className="w-5 h-5 mr-2" />
            Começar Treino
          </Button>
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
