import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Dumbbell, Flame, TrendingUp, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { EffortScale, AchievementBadge } from '@/components/gamification';
import { useStreak } from '@/hooks/useStreak';
import { useAchievements } from '@/hooks/useAchievements';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AchievementDefinition, AchievementStats } from '@/lib/achievements';

interface SessionData {
  sessionId: string;
  durationMinutes: number;
  completedSets: number;
  totalSets: number;
  workoutName: string;
}

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { streak, updateStreak } = useStreak();
  const { checkAndUnlockAchievements, totalUnlocked } = useAchievements();
  const { sessions: workoutSessions } = useWorkoutSessions();

  const sessionData = location.state as SessionData | null;

  const [perceivedEffort, setPerceivedEffort] = useState(5);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newAchievements, setNewAchievements] = useState<AchievementDefinition[]>([]);
  const [showConfetti, setShowConfetti] = useState(true);
  const [streakUpdated, setStreakUpdated] = useState(false);

  // Calculate stats for achievements
  const achievementStats = useMemo((): AchievementStats => {
    const now = new Date();
    const totalSessions = workoutSessions.filter(s => s.status === 'completed').length + 1; // +1 for current
    
    return {
      totalSessions,
      currentStreak: (streak?.current_streak ?? 0) + (streakUpdated ? 0 : 1),
      longestStreak: streak?.longest_streak ?? 0,
      totalVolume: 0, // TODO: Calculate from exercises_data
      workoutHour: now.getHours(),
      daysSinceLastWorkout: streak?.last_workout_date 
        ? Math.floor((now.getTime() - new Date(streak.last_workout_date).getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
    };
  }, [workoutSessions, streak, streakUpdated]);

  // Update streak and check achievements on mount
  useEffect(() => {
    const initializeCompletion = async () => {
      if (streakUpdated) return;
      
      try {
        // Update streak
        await updateStreak();
        setStreakUpdated(true);

        // Check for new achievements
        const unlocked = await checkAndUnlockAchievements(achievementStats);
        setNewAchievements(unlocked);
      } catch (error) {
        console.error('Error updating completion data:', error);
      }
    };

    initializeCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide confetti after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!sessionData?.sessionId || !user?.id) {
      navigate('/dashboard');
      return;
    }

    setIsSaving(true);
    try {
      // Save perceived effort and notes
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          perceived_effort: perceivedEffort,
          session_notes: sessionNotes || null,
        })
        .eq('id', sessionData.sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving session data:', error);
      navigate('/dashboard');
    }
  };

  const suggestedNotes = [
    'Energia alta',
    'Dormiu mal',
    'Equipamento ocupado',
    'Foco total',
  ];

  // Redirect if no session data
  if (!sessionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <p className="text-muted-foreground mb-4">Sessão não encontrada</p>
        <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          >
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{
                  y: '100vh',
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeIn',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Success Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center space-y-4"
        >
          <motion.div
            className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Check className="h-10 w-10 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Treino Concluído! 💪
            </h1>
            <p className="text-muted-foreground mt-1">
              {sessionData.workoutName}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{sessionData.durationMinutes}</p>
              <p className="text-xs text-muted-foreground">minutos</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <Dumbbell className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{sessionData.completedSets}</p>
              <p className="text-xs text-muted-foreground">séries</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <motion.p
                key={streak?.current_streak}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold"
              >
                {(streak?.current_streak ?? 0) + (streakUpdated ? 0 : 1)}
              </motion.p>
              <p className="text-xs text-muted-foreground">sequência</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* New Achievements */}
        <AnimatePresence>
          {newAchievements.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-card border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-foreground">
                      Nova Conquista!
                    </h3>
                  </div>
                  <div className="flex justify-center gap-6">
                    {newAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.key}
                        achievement={achievement}
                        isUnlocked
                        showAnimation
                        size="lg"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Effort Scale */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-center mb-6">
                Como foi o treino hoje?
              </h3>
              <EffortScale
                value={perceivedEffort}
                onChange={setPerceivedEffort}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Session Notes */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Notas (opcional)
              </h3>
              <Textarea
                placeholder="Algo a notar sobre este treino?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                maxLength={200}
                className="resize-none"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {suggestedNotes.map((note) => (
                  <button
                    key={note}
                    onClick={() => setSessionNotes(prev => 
                      prev ? `${prev}, ${note}` : note
                    )}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  >
                    {note}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3 pt-4"
        >
          <Button
            size="lg"
            className="w-full h-14 rounded-2xl text-lg font-semibold"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar e Continuar'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => navigate('/progress')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Ver Progresso
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
