import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Dumbbell, TrendingUp, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/workout', icon: Dumbbell, label: 'Treino' },
  { path: '/progress', icon: TrendingUp, label: 'Progresso' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Ocultar em desktop ou rotas de fluxo linear
  const hiddenRoutes = ['/', '/login', '/reset-password', '/onboarding', '/result', '/pricing'];
  const shouldHide = !isMobile || hiddenRoutes.includes(location.pathname);
  
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (path === '/workout' && location.pathname.startsWith('/workout'));
          
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1",
                "transition-colors duration-200",
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
}
