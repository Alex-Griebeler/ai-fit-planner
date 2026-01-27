import { forwardRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Dumbbell, Trophy, TrendingUp, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/result', icon: Dumbbell, label: 'Treino' },
  { path: '/achievements', icon: Trophy, label: 'Conquistas' },
  { path: '/progress', icon: TrendingUp, label: 'Progresso' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export const BottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Ocultar em desktop ou rotas de fluxo linear
  const hiddenRoutes = ['/', '/login', '/reset-password', '/onboarding', '/pricing'];
  const isWorkoutExecution = location.pathname === '/workout';
  const shouldHide = !isMobile || hiddenRoutes.includes(location.pathname) || isWorkoutExecution;
  
  if (shouldHide) return null;

  return (
    <nav 
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-inset-bottom"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.85 }}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1",
                "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
});
BottomNav.displayName = 'BottomNav';
