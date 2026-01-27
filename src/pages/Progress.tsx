import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, Dumbbell, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PremiumGate } from '@/components/PremiumGate';
import { LoadProgressChart } from '@/components/progress/LoadProgressChart';
import { VolumeStats } from '@/components/progress/VolumeStats';
import { PersonalRecordsCard } from '@/components/progress/PersonalRecordsCard';
import { PeriodComparisonCard } from '@/components/progress/PeriodComparisonCard';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';

export default function Progress() {
  const navigate = useNavigate();
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

      {/* Header - h-14 padronizado */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 press-scale"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Meu Progresso</h1>
        </div>
      </header>

      <main id="progress-content" className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <PremiumGate feature="Análises de progresso" showPreview>
          <div className="space-y-6">
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
            <VolumeStats sessions={completedSessions} />
          </div>
        </PremiumGate>
      </main>
    </div>
  );
}
