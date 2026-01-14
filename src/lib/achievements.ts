import { Rocket, Flame, Mountain, Sun, Moon, Weight, Medal, Trophy, Star, Sparkles, type LucideIcon } from 'lucide-react';

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'streak' | 'volume' | 'consistency' | 'special';
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  workoutHour?: number;
  daysSinceLastWorkout?: number;
  weeklySessionsCompleted?: number;
  weeklySessionsTarget?: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: 'first_workout',
    name: 'Primeiro Passo',
    description: 'Complete seu primeiro treino',
    icon: Rocket,
    category: 'consistency',
    condition: (stats) => stats.totalSessions >= 1,
  },
  {
    key: 'streak_7',
    name: 'Semana de Fogo',
    description: 'Mantenha uma sequência de 7 dias',
    icon: Flame,
    category: 'streak',
    condition: (stats) => stats.currentStreak >= 7 || stats.longestStreak >= 7,
  },
  {
    key: 'streak_30',
    name: 'Mês de Ferro',
    description: 'Mantenha uma sequência de 30 dias',
    icon: Mountain,
    category: 'streak',
    condition: (stats) => stats.currentStreak >= 30 || stats.longestStreak >= 30,
  },
  {
    key: 'early_bird',
    name: 'Madrugador',
    description: 'Treine antes das 7h da manhã',
    icon: Sun,
    category: 'special',
    condition: (stats) => stats.workoutHour !== undefined && stats.workoutHour < 7,
  },
  {
    key: 'night_owl',
    name: 'Coruja',
    description: 'Treine após às 21h',
    icon: Moon,
    category: 'special',
    condition: (stats) => stats.workoutHour !== undefined && stats.workoutHour >= 21,
  },
  {
    key: 'volume_1000',
    name: 'Tonelada',
    description: 'Acumule 1.000kg de volume total',
    icon: Weight,
    category: 'volume',
    condition: (stats) => stats.totalVolume >= 1000,
  },
  {
    key: 'sessions_10',
    name: 'Dedicado',
    description: 'Complete 10 treinos',
    icon: Medal,
    category: 'consistency',
    condition: (stats) => stats.totalSessions >= 10,
  },
  {
    key: 'sessions_50',
    name: 'Veterano',
    description: 'Complete 50 treinos',
    icon: Trophy,
    category: 'consistency',
    condition: (stats) => stats.totalSessions >= 50,
  },
  {
    key: 'perfect_week',
    name: 'Semana Perfeita',
    description: 'Complete todos os treinos planejados da semana',
    icon: Star,
    category: 'consistency',
    condition: (stats) => 
      stats.weeklySessionsCompleted !== undefined && 
      stats.weeklySessionsTarget !== undefined &&
      stats.weeklySessionsCompleted >= stats.weeklySessionsTarget,
  },
  {
    key: 'comeback',
    name: 'Retorno Triunfal',
    description: 'Volte a treinar após 7+ dias de ausência',
    icon: Sparkles,
    category: 'special',
    condition: (stats) => stats.daysSinceLastWorkout !== undefined && stats.daysSinceLastWorkout >= 7,
  },
];

export function getAchievementByKey(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export function checkNewAchievements(
  stats: AchievementStats,
  unlockedKeys: string[]
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    achievement => 
      !unlockedKeys.includes(achievement.key) && 
      achievement.condition(stats)
  );
}
