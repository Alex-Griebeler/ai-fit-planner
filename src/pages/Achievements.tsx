import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { PageHeader, LoadingScreen } from '@/components/shared';

const categoryLabels: Record<string, string> = {
  consistency: 'Consistência',
  streak: 'Sequência',
  volume: 'Volume',
  special: 'Especiais',
};

const categoryOrder = ['consistency', 'streak', 'volume', 'special'];

export default function Achievements() {
  const { getAllAchievementsWithStatus, totalUnlocked, totalAchievements, isLoading } = useAchievements();

  const achievementsWithStatus = getAllAchievementsWithStatus();
  const progressPercentage = totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0;

  const groupedAchievements = categoryOrder.reduce((acc, category) => {
    acc[category] = achievementsWithStatus.filter(a => a.category === category);
    return acc;
  }, {} as Record<string, typeof achievementsWithStatus>);

  if (isLoading) {
    return <LoadingScreen message="Carregando conquistas..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Conquistas" 
        rightContent={
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{totalUnlocked}</span>
            <span className="text-muted-foreground">/ {totalAchievements}</span>
          </div>
        }
      />

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Progresso Geral */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Progresso Total
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {totalUnlocked === 0 
                  ? 'Comece a treinar para desbloquear conquistas!'
                  : totalUnlocked === totalAchievements
                  ? '🎉 Parabéns! Você desbloqueou todas as conquistas!'
                  : `Faltam ${totalAchievements - totalUnlocked} conquistas para completar a coleção.`
                }
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categorias */}
        {categoryOrder.map((category, categoryIndex) => {
          const achievements = groupedAchievements[category];
          if (!achievements || achievements.length === 0) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * (categoryIndex + 1) }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">
                    {categoryLabels[category]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.key}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: 0.05 * index + 0.1 * (categoryIndex + 1) 
                        }}
                        className="flex flex-col items-center"
                      >
                        <AchievementBadge
                          achievement={achievement}
                          isUnlocked={achievement.isUnlocked}
                          unlockedAt={achievement.unlockedAt}
                          size="lg"
                        />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

      </main>
    </div>
  );
}
