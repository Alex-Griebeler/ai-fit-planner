import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Dumbbell, ChevronRight, Sparkles } from 'lucide-react';
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
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-20 bg-muted rounded" />
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
          <p className="text-muted-foreground">
            Clique em "Novo Plano" acima para criar seu treino personalizado
          </p>
        </CardContent>
      </Card>
    );
  }

  const planData = plan.plan_data as PlanData;
  const workouts = planData?.workouts ?? [];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="default" className="mb-2 bg-primary/20 text-primary border-0">
              Plano Ativo
            </Badge>
            <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/result')}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
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
              {workouts.slice(0, 3).map((workout, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">{workout.focus}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {workout.exercises?.length ?? 0} exercícios
                  </Badge>
                </div>
              ))}
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
