import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { Button } from '@/components/ui/button';
import { 
  ProfileCard, 
  ActivePlanCard, 
  WorkoutHistoryCard, 
  StatsCard 
} from '@/components/dashboard';
import { 
  Plus, 
  LogOut, 
  Dumbbell, 
  Calendar, 
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { 
    plans, 
    activePlan, 
    isLoading: plansLoading, 
    deletePlan 
  } = useWorkoutPlans();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deletePlan(planId);
      toast.success('Plano excluído com sucesso');
    } catch {
      toast.error('Erro ao excluir plano');
    }
  };

  // Estatísticas
  const totalPlans = plans.length;
  const totalWorkouts = plans.reduce((acc, plan) => {
    const planData = plan.plan_data as { workouts?: unknown[] };
    return acc + (planData?.workouts?.length ?? 0);
  }, 0);
  const weeklyFrequency = activePlan?.weekly_frequency ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileCard profile={profile} isLoading={profileLoading} />
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatsCard
            icon={<Dumbbell className="w-5 h-5" />}
            label="Total de Planos"
            value={totalPlans}
          />
          <StatsCard
            icon={<Calendar className="w-5 h-5" />}
            label="Treinos/Semana"
            value={weeklyFrequency > 0 ? `${weeklyFrequency}x` : '-'}
          />
          <StatsCard
            icon={<Target className="w-5 h-5" />}
            label="Treinos Criados"
            value={totalWorkouts}
          />
          <StatsCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Duração"
            value={activePlan?.session_duration ?? '-'}
          />
        </motion.div>

        {/* Active Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <ActivePlanCard plan={activePlan ?? null} isLoading={plansLoading} />
        </motion.div>

        {/* Workout History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <WorkoutHistoryCard 
            plans={plans} 
            isLoading={plansLoading} 
            onDeletePlan={handleDeletePlan}
          />
        </motion.div>
      </main>
    </div>
  );
}
