import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ProfileCard, 
  ActivePlanCard, 
  WorkoutHistoryCard, 
  StatsCard,
  SessionHistoryCard,
  ProgressPreviewCard 
} from '@/components/dashboard';
import { StreakCard, MotivationalMessage, WeeklyProgress } from '@/components/gamification';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { usePerformanceMetrics, formatActiveTime } from '@/hooks/usePerformanceMetrics';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Plus, LogOut, Calendar, Target, Flame, Timer } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { sessions, isLoading: sessionsLoading, deleteSession } = useWorkoutSessions();
  const haptic = useHapticFeedback();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deletePlan(planId);
      toast.success('Plano excluído com sucesso', { duration: 2000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir plano';
      toast.error(message, { duration: 4000 });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Treino excluído do histórico', { duration: 2000 });
    } catch {
      toast.error('Erro ao excluir treino', { duration: 4000 });
    }
  };

  const handleNewPlan = () => {
    haptic.impact();
    navigate('/onboarding');
  };

  // Performance metrics from sessions
  const weeklyGoal = activePlan?.weekly_frequency ?? 0;
  const metrics = usePerformanceMetrics(sessions, weeklyGoal);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
          {activePlan && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 press-scale">
                    <Plus className="w-4 h-4 mr-1" />
                    Novo Plano
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Criar novo plano?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você já possui um plano ativo. Ao criar um novo, o atual será desativado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleNewPlan}
                      className="press-scale"
                    >
                      Continuar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              aria-label="Sair da conta"
              className="focus-ring"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="container max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileCard profile={profile} isLoading={profileLoading} />
        </motion.div>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <MotivationalMessage userName={profile?.name} />
        </motion.div>

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <StreakCard />
        </motion.div>

        {/* Weekly Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <Card className="p-4">
            <WeeklyProgress />
          </Card>
        </motion.div>

        {/* Active Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <ActivePlanCard plan={activePlan ?? null} isLoading={plansLoading} />
        </motion.div>

        {/* Performance Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatsCard
            icon={<Calendar className="w-5 h-5" />}
            label="Treinos"
            value={weeklyGoal > 0 ? `${metrics.workoutsThisWeek}/${weeklyGoal}` : metrics.workoutsThisWeek}
            subtext="esta semana"
          />
          <StatsCard
            icon={<Target className="w-5 h-5" />}
            label="Conclusão"
            value={metrics.completionRate > 0 ? `${metrics.completionRate}%` : '-'}
            subtext="séries completadas"
            trend={metrics.completionRate > 0 ? metrics.completionTrend : undefined}
          />
          <StatsCard
            icon={<Flame className="w-5 h-5" />}
            label="Intensidade"
            value={metrics.avgRpe ?? '-'}
            subtext="RPE médio"
            trend={metrics.avgRpe ? metrics.rpeTrend : undefined}
          />
          <StatsCard
            icon={<Timer className="w-5 h-5" />}
            label="Tempo Ativo"
            value={formatActiveTime(metrics.totalMinutes)}
            subtext="esta semana"
          />
        </motion.div>

        {/* Session History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <SessionHistoryCard 
            sessions={sessions || []} 
            isLoading={sessionsLoading}
            onDeleteSession={handleDeleteSession}
          />
        </motion.div>

        {/* Progress Preview CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <ProgressPreviewCard />
        </motion.div>

        {/* Workout Plans History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
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
