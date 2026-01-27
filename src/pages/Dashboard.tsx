import { useState } from 'react';
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
import { PlanRatingDialog } from '@/components/dashboard/PlanRatingDialog';
import { StreakCard, MotivationalMessage, WeeklyProgress } from '@/components/gamification';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { Plus, LogOut, Dumbbell, Calendar, Target, TrendingUp } from 'lucide-react';
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
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const { signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { 
    plans, 
    activePlan, 
    isLoading: plansLoading, 
    deletePlan,
    deactivatePlan,
    isDeactivating
  } = useWorkoutPlans();
  const { sessions, isLoading: sessionsLoading, deleteSession } = useWorkoutSessions();

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

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Treino excluído do histórico');
    } catch {
      toast.error('Erro ao excluir treino');
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
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Header - h-14 padronizado */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            {activePlan && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="press-scale">
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
                      onClick={() => setShowRatingDialog(true)}
                      className="press-scale"
                    >
                      Continuar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Rating Dialog */}
            <PlanRatingDialog
              open={showRatingDialog}
              onOpenChange={(open) => {
                if (!open && !isSubmittingRating) {
                  setShowRatingDialog(false);
                }
              }}
              planName={activePlan?.plan_name || 'Plano atual'}
              isSubmitting={isSubmittingRating}
              onSubmit={async (rating, notes) => {
                try {
                  setIsSubmittingRating(true);
                  if (activePlan) {
                    await deactivatePlan({ 
                      planId: activePlan.id, 
                      rating, 
                      ratingNotes: notes 
                    });
                  }
                  setShowRatingDialog(false);
                  navigate('/onboarding');
                } catch (error) {
                  toast.error('Erro ao salvar avaliação');
                } finally {
                  setIsSubmittingRating(false);
                }
              }}
            />
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
