import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Dumbbell, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PremiumGate } from '@/components/PremiumGate';
import { LoadProgressChart } from '@/components/progress/LoadProgressChart';
import { VolumeStats } from '@/components/progress/VolumeStats';
import { PersonalRecordsCard } from '@/components/progress/PersonalRecordsCard';
import { PeriodComparisonCard } from '@/components/progress/PeriodComparisonCard';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { PageHeader } from '@/components/shared';

export default function Progress() {
  const { sessions } = useWorkoutSessions();

  // Calculate stats
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalSets = completedSessions.reduce((acc, s) => acc + s.completed_sets, 0);
  const totalMinutes = completedSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a href="#progress-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      <PageHeader 
        title="Meu Progresso"
        backTo="/dashboard"
        rightContent={
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-semibold">{completedSessions.length}</span>
          </div>
        }
      />

      <main id="progress-content" className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <PremiumGate feature="Análises de progresso" showPreview>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{completedSessions.length}</p>
                  <p className="text-xs text-muted-foreground">Treinos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{totalSets}</p>
                  <p className="text-xs text-muted-foreground">Séries</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{Math.round(totalMinutes / 60)}h</p>
                  <p className="text-xs text-muted-foreground">Treinando</p>
                </CardContent>
              </Card>
            </div>

            {/* Personal Records */}
            <PersonalRecordsCard />

            {/* Period Comparison */}
            <PeriodComparisonCard sessions={completedSessions} />

            {/* Load Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Evolução de Cargas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LoadProgressChart />
              </CardContent>
            </Card>

            {/* Volume Stats */}
            <div>
              <VolumeStats sessions={completedSessions} />
            </div>
          </motion.div>
        </PremiumGate>
      </main>
    </div>
  );
}
