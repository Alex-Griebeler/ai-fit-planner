import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ACHIEVEMENTS, checkNewAchievements, getAchievementByKey, type AchievementStats, type AchievementDefinition } from '@/lib/achievements';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user achievements
  const achievementsQuery = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Unlock a new achievement
  const unlockMutation = useMutation({
    mutationFn: async (achievementKey: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_key: achievementKey,
        })
        .select()
        .single();

      if (error) {
        // Ignore duplicate key errors (already unlocked)
        if (error.code === '23505') return null;
        throw error;
      }
      return data as UserAchievement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-achievements', user?.id] });
    },
  });

  // Check and unlock new achievements based on stats
  const checkAndUnlockAchievements = async (stats: AchievementStats): Promise<AchievementDefinition[]> => {
    const unlockedKeys = achievementsQuery.data?.map(a => a.achievement_key) ?? [];
    const newAchievements = checkNewAchievements(stats, unlockedKeys);

    // Unlock each new achievement
    for (const achievement of newAchievements) {
      await unlockMutation.mutateAsync(achievement.key);
    }

    return newAchievements;
  };

  // Get unlocked achievements with full definitions
  const getUnlockedAchievements = (): (UserAchievement & { definition: AchievementDefinition })[] => {
    if (!achievementsQuery.data) return [];

    return achievementsQuery.data
      .map(userAchievement => {
        const definition = getAchievementByKey(userAchievement.achievement_key);
        if (!definition) return null;
        return { ...userAchievement, definition };
      })
      .filter((a): a is UserAchievement & { definition: AchievementDefinition } => a !== null);
  };

  // Get all achievements with unlock status
  const getAllAchievementsWithStatus = () => {
    const unlockedKeys = new Set(achievementsQuery.data?.map(a => a.achievement_key) ?? []);
    
    return ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      isUnlocked: unlockedKeys.has(achievement.key),
      unlockedAt: achievementsQuery.data?.find(a => a.achievement_key === achievement.key)?.unlocked_at,
    }));
  };

  return {
    achievements: achievementsQuery.data ?? [],
    isLoading: achievementsQuery.isLoading,
    checkAndUnlockAchievements,
    getUnlockedAchievements,
    getAllAchievementsWithStatus,
    totalUnlocked: achievementsQuery.data?.length ?? 0,
    totalAchievements: ACHIEVEMENTS.length,
  };
}
