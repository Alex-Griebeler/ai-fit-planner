import { motion } from 'framer-motion';
import type { AchievementDefinition } from '@/lib/achievements';

interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  isUnlocked: boolean;
  unlockedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
}

export function AchievementBadge({ 
  achievement, 
  isUnlocked, 
  unlockedAt,
  size = 'md',
  showAnimation = false,
}: AchievementBadgeProps) {
  const Icon = achievement.icon;
  
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  const categoryColors = {
    streak: 'from-orange-500 to-red-500',
    volume: 'from-blue-500 to-indigo-500',
    consistency: 'from-green-500 to-emerald-500',
    special: 'from-purple-500 to-pink-500',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-2 text-center"
      initial={showAnimation ? { scale: 0, rotate: -180 } : false}
      animate={showAnimation ? { scale: 1, rotate: 0 } : false}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      {/* Badge circle */}
      <div className="relative">
        <motion.div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 ${
            isUnlocked
              ? `bg-gradient-to-br ${categoryColors[achievement.category]} shadow-lg`
              : 'bg-muted border-2 border-dashed border-muted-foreground/30'
          }`}
          whileHover={isUnlocked ? { scale: 1.1 } : {}}
          whileTap={isUnlocked ? { scale: 0.95 } : {}}
        >
          <Icon 
            className={`${iconSizes[size]} ${
              isUnlocked ? 'text-white' : 'text-muted-foreground/50'
            }`} 
          />
        </motion.div>

        {/* Glow effect for unlocked */}
        {isUnlocked && showAnimation && (
          <motion.div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-br ${categoryColors[achievement.category]}`}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Name and date */}
      <div className="space-y-0.5">
        <p className={`font-medium ${
          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
        } ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {achievement.name}
        </p>
        {isUnlocked && unlockedAt && size !== 'sm' && (
          <p className="text-xs text-muted-foreground">
            {formatDate(unlockedAt)}
          </p>
        )}
        {!isUnlocked && size !== 'sm' && (
          <p className="text-xs text-muted-foreground/70">
            {achievement.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
