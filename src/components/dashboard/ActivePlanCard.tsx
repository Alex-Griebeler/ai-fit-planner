import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Dumbbell, ChevronRight, Sparkles, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ActivePlanCardProps {
  plan: WorkoutPlan | null;
  isLoading: boolean;
}

interface PlanDataWorkout {
  day: string;
  name: string;
  focus: string;
  muscleGroups?: string[];
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
  }>;
}

interface PlanData {
  workouts?: PlanDataWorkout[];
  motivationalMessage?: string;
}

export function ActivePlanCard({ plan, isLoading }: ActivePlanCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum plano ativo
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro plano de treino personalizado
          </p>
          <Button 
            variant="gradient" 
            className="press-scale"
            onClick={() => navigate('/onboarding')}
            aria-label="Criar plano de treino personalizado"
          >
            Criar Plano
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planData = plan.plan_data as PlanData;
  const workouts = planData?.workouts ?? [];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.98]"
        onClick={() => navigate('/result')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/result')}
        aria-label="Ver detalhes do plano"
      >
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="default" className="mb-2 bg-primary/20 text-primary border-0">
              Plano Ativo
            </Badge>
            <CardTitle className="text-xl">
              {plan.plan_name
                .replace(/\s*\d+\s*dias?\s*/gi, ' ')
                .replace(/\s*(emagrecimento|hipertrofia|força|resistência|intenso|moderado)\s*/gi, ' ')
                .replace(/\s+(ULPPL|PPL|ABC|ABCD|ABCDE|Full Body|Upper|Lower)\s*/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim()}
            </CardTitle>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{plan.weekly_frequency}x/semana</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{plan.session_duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            <span>{workouts.length} treinos</span>
          </div>
        </div>

        {workouts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Próximos treinos:</p>
            <div className="grid gap-2">
              {workouts.slice(0, 3).map((workout, index) => {
                // Remove parenthetical suffixes like (força), (hipertrofia), (metabólico)
                const cleanName = workout.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const cleanFocus = workout.focus?.replace(/\s*\([^)]*\)\s*$/, '').trim();
                
                return (
                  <button 
                    key={index}
                    onClick={() => navigate(`/workout-preview?day=${encodeURIComponent(workout.day)}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Iniciar treino ${cleanName}`}
                  >
                    <p className="font-medium text-foreground">{cleanName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {workout.exercises?.length ?? 0} exercícios
                      </Badge>
                      <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Criado em {format(new Date(plan.created_at), "d 'de' MMMM", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}
